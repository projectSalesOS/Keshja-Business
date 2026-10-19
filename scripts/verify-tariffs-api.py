import os,json,uuid,requests,concurrent.futures
url=os.environ['SUPABASE_URL'].rstrip('/')+'/rest/v1'
service=os.environ['SUPABASE_SERVICE_ROLE_KEY'];sess=json.loads(os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']);user=sess['user']['id'];token=sess['access_token']
publish=os.environ.get('VITE_SUPABASE_PUBLISHABLE_KEY') or os.environ.get('SUPABASE_ANON_KEY')
if not publish:
 for line in open('.env'):
  if line.startswith('VITE_SUPABASE_PUBLISHABLE_KEY='):publish=line.split('=',1)[1].strip().strip('"')
admin={'apikey':service,'Content-Type':'application/json','Prefer':'return=representation'}
if not service.startswith('sb_'):admin['Authorization']='Bearer '+service
member={'apikey':publish,'Authorization':'Bearer '+token,'Content-Type':'application/json','Prefer':'return=representation'}
def call(path,data=None,headers=admin,method='POST'):
 r=requests.request(method,url+path,headers=headers,json=data,timeout=30)
 return r
checks=0
def check(name,ok):
 global checks
 assert ok,name;checks+=1;print('PASS',name)
org=None;operator_added=False
try:
 r=call('/organizations',{'name':'Temporary tariff integration verification','created_by':user});assert r.ok,r.status_code;org=r.json()[0]['id']
 assert call('/organization_members',{'organization_id':org,'user_id':user,'role':'owner'}).ok
 def rpc(name,data,headers=admin):return call('/rpc/'+name,data,headers)
 def row():return {'organization_id':org,'created_by':user,'type':'expense','amount':1,'booking_date':'2026-10-19','category':'Sonstiges','description':'temporary concurrent verification'}
 r=call('/transactions',[row() for _ in range(49)],member);check('49 real-user manual rows allowed',r.ok)
 with concurrent.futures.ThreadPoolExecutor(2) as pool:res=list(pool.map(lambda _:call('/transactions',row(),member),range(2)))
 check('Concurrent last manual slot: exactly one success',sum(r.ok for r in res)==1)
 counted=call('/transactions?organization_id=eq.'+org+'&select=id',headers=admin,method='GET');check('Exactly 50 manual rows read back',len(counted.json())==50)
 requests_ids=[str(uuid.uuid4()) for _ in range(4)]
 for rid in requests_ids[:2]:assert rpc('reserve_ocr',{'_org':org,'_user':user,'_request':rid,'_hash':'h'+rid}).ok
 def reserve(rid):return rpc('reserve_ocr',{'_org':org,'_user':user,'_request':rid,'_hash':'h'+rid})
 with concurrent.futures.ThreadPoolExecutor(2) as pool:res=list(pool.map(reserve,requests_ids[2:]))
 check('Concurrent last OCR slot: exactly one success',sum(r.ok for r in res)==1)
 rr=reserve(requests_ids[0]);check('OCR retry remains reserved, not new',rr.ok and rr.json()['state']=='reserved')
 r=rpc('finish_ocr',{'_request':requests_ids[0],'_state':'confirmed','_result':{'verification':True}});check('OCR confirmed',r.ok)
 check('Confirmed OCR returns stored result',reserve(requests_ids[0]).json().get('result')=={'verification':True})
 check('Fourth OCR denied',not reserve(str(uuid.uuid4())).ok)
 foreign=rpc('reserve_ocr',{'_org':org,'_user':str(uuid.uuid4()),'_request':str(uuid.uuid4()),'_hash':'foreign'});check('Foreign OCR membership denied',not foreign.ok)
 # Authorize only during this controlled test, remove in finally.
 existing=call('/platform_operators?user_id=eq.'+user,headers=admin,method='GET').json()
 if not existing:
  r=call('/platform_operators',{'user_id':user});assert r.ok;operator_added=True
 start='2026-10-18T11:02:00Z';end='2026-11-19T11:02:00Z'
 def setsub(plan,status,start=start,end=end,reason='Temporary integration verification'):
  return rpc('operator_set_subscription',{'_org':org,'_plan':plan,'_status':status,'_start':start,'_end':end,'_reason':reason},member)
 check('Actual operator manual Premium activation',setsub('premium','active').ok)
 overview=rpc('tariff_overview',{'_org':org},member).json();check('Premium reads back to member',overview['plan']['id']=='premium')
 check('Premium manual booking above Free limit',call('/transactions',row(),member).ok)
 voice=row();voice['capture_source']='voice';check('Premium voice booking accepted by DB',call('/transactions',voice,member).ok)
 check('Cancellation cannot shorten paid period',not setsub('premium','canceled',end='2026-10-20T00:00:00Z').ok)
 check('Cancellation retains paid period',setsub('premium','canceled').ok and rpc('tariff_overview',{'_org':org},member).json()['plan']['id']=='premium')
 check('Past due reduces rights to Free',setsub('premium','past_due').ok and rpc('tariff_overview',{'_org':org},member).json()['plan']['id']=='free')
 check('Expired status reduces rights to Free',setsub('premium','expired').ok and rpc('tariff_overview',{'_org':org},member).json()['plan']['id']=='free')
 check('Seven-day manual trial',setsub('premium','trialing',start='2026-10-19T00:00:00Z',end='2026-10-26T00:00:00Z').ok)
 check('Reset to Free',setsub('free','free',end=None).ok)
 check('Trial cannot be restarted',not setsub('premium','trialing').ok)
 check('Reason required',not setsub('basic','active',reason='').ok)
 check('Reviewed reservation refund',rpc('operator_refund_ocr',{'_request':requests_ids[1],'_reason':'Verified no AI executed: reservation-only integration test'},member).ok)
 check('Reviewed refund is idempotently rejected on repeat',not rpc('operator_refund_ocr',{'_request':requests_ids[1],'_reason':'Verified no AI executed: reservation-only integration test'},member).ok)
 check('Refund restores exactly one scan',rpc('tariff_overview',{'_org':org},member).json()['ocr_used']==2)
 audit=call('/subscription_audit?organization_id=eq.'+org,headers=admin,method='GET');check('Operator changes record actor and reason',len(audit.json())>=7 and all(a['administrator']==user and a['reason'] for a in audit.json()))
 # Central catalog edit no-op, verifies protected mutation and audit; no price changes.
 plans=call('/tariff_plans?id=eq.basic',headers=admin,method='GET').json()[0]
 check('Operator central tariff editor authorized',rpc('operator_set_plan',{'_plan':'basic','_values':plans,'_reason':'Temporary no-op rule verification'},member).ok)
finally:
 if org:
  for table,col in [('payments','organization_id'),('transactions','organization_id'),('fixed_costs','organization_id'),('ocr_usage','organization_id'),('subscription_audit','organization_id'),('subscriptions','organization_id'),('organization_members','organization_id')]:
   r=call('/'+table+'?'+col+'=eq.'+org,headers=admin,method='DELETE')
   assert r.ok,('cleanup',table,r.status_code)
  r=call('/organizations?id=eq.'+org,headers=admin,method='DELETE');assert r.ok,('cleanup org',r.status_code)
 if operator_added:
  r=call('/platform_operators?user_id=eq.'+user,headers=admin,method='DELETE');assert r.ok,('cleanup operator',r.status_code)
print(checks,'actual API integration checks passed; temporary org and operator grant removed; no AI calls.')
