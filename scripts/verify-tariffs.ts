// Integration checks use a privileged test connection, but every authorization
// assertion of RPC authorization uses claims. RLS/GRANT denials are tested separately
// with real bearer Data API calls; this connection cannot SET ROLE.
// All data/config changes are rolled back; never grant an operator persistently.
import postgres from 'postgres';
import assert from 'node:assert/strict';
const url=process.env['SUPABASE_DB_URL'];
if(!url) throw new Error('Database test connection unavailable');
const sql=postgres(url,{max:4,prepare:false,onnotice:()=>{}});
let checks=0;
const check=(label:string,condition:unknown)=>{assert.ok(condition,label);checks++;console.log('PASS',label);};
class Rollback extends Error{}
try{
 await sql.begin(async tx=>{
 const [member]=await tx`select user_id,organization_id from public.organization_members order by created_at limit 1`;
 if(!member)throw new Error('Existing account required');
 const user=member.user_id;
 await tx`select set_config('request.jwt.claim.sub',${user},true)`;
 const [org]=await tx`insert into public.organizations(name,created_by) values('Rollback tariff verification',${user}) returning id`;
 const id=org.id;
 await tx`insert into public.organization_members(organization_id,user_id,role) values(${id},${user},'owner')`;
 const plans=await tx`select * from public.tariff_plans order by price_cents`;
 check('Free 0 EUR',plans[0].price_cents===0);check('Basic 9.90 EUR and 20 scans',plans[1].price_cents===990&&plans[1].ocr_limit===20);check('Premium 19.90 EUR and 150 scans',plans[2].price_cents===1990&&plans[2].ocr_limit===150);
 check('Basic no voice/logo/advanced',!plans[1].voice&&!plans[1].logo&&!plans[1].advanced_reports);check('Premium voice/logo/advanced',plans[2].voice&&plans[2].logo&&plans[2].advanced_reports);
 const [initial]=await tx`select * from public.subscriptions where organization_id=${id}`;check('New org receives Free',initial.plan_id==='free'&&initial.status==='free');
 const fail=async(label:string,fn:()=>Promise<unknown>)=>{let denied=false;try{await tx.savepoint(async()=>{await fn();});}catch{denied=true;}check(label,denied);};

 await fail('Member cannot admin RPC',()=>tx`select public.operator_dashboard()`);
 await fail('Member cannot issue fake voice booking',()=>tx`insert into public.transactions(organization_id,type,amount,booking_date,category,capture_source,created_by) values(${id},'expense',1,current_date,'Sonstiges','voice',${user})`);

 await tx`update public.tariff_plans set manual_limit=1 where id='free'`;

 await tx`insert into public.transactions(organization_id,type,amount,booking_date,category,created_by) values(${id},'expense',1,current_date,'Sonstiges',${user})`;
 await fail('Free booking limit denies second manual row',()=>tx`insert into public.transactions(organization_id,type,amount,booking_date,category,created_by) values(${id},'expense',1,current_date,'Sonstiges',${user})`);
 await tx`update public.transactions set amount=2 where organization_id=${id}`;const [edited]=await tx`select amount from public.transactions where organization_id=${id}`;check('Existing manual booking remains editable',Number(edited.amount)===2);
 const [rec]=await tx`insert into public.fixed_costs(user_id,organization_id,name,amount,category,interval,due_day,start_date) values(${user},${id},'Verification recurring',1,'Sonstiges','monatlich',1,current_date) returning id`;
 await fail('Forged recurring link cannot bypass manual limit',()=>tx`insert into public.transactions(organization_id,type,amount,booking_date,category,recurring_expense_id,recurring_period,created_by) values(${id},'expense',1,current_date,'Sonstiges',${rec.id},current_date,${user})`);
 const [book]=await tx`select public.book_due_recurring_expenses(${id}) n`;check('Recurring RPC excluded from manual limit',book.n===1);
 const [repeat]=await tx`select public.book_due_recurring_expenses(${id}) n`;check('Recurring retry cannot double book',repeat.n===0);

 const request=crypto.randomUUID();await tx`select public.reserve_ocr(${id},${user},${request},'same-image')`;
 const [retry]=await tx`select public.reserve_ocr(${id},${user},${request},'same-image') r`;check('OCR request retry is not new inference',retry.r.state==='reserved');
 await fail('OCR request content mismatch rejected',()=>tx`select public.reserve_ocr(${id},${user},${request},'different-image')`);
 await tx`select public.reserve_ocr(${id},${user},${crypto.randomUUID()},'image2')`;await tx`select public.reserve_ocr(${id},${user},${crypto.randomUUID()},'image3')`;
 await fail('Free OCR limit denies fourth reservation',()=>tx`select public.reserve_ocr(${id},${user},${crypto.randomUUID()},'image4')`);
 await tx`select public.finish_ocr(${request},'refunded',null,'confirmed not started')`;await tx`select public.finish_ocr(${request},'refunded',null,'idempotent refund')`;
 const [used]=await tx`select count(*)::int n from public.ocr_usage where organization_id=${id} and state<>'refunded'`;check('Refund idempotent, two reservations count',used.n===2);
 await tx`insert into public.platform_operators(user_id) values(${user}) on conflict do nothing`;

 await tx`select public.operator_set_subscription(${id},'premium','active',now()-interval '1 day',now()+interval '30 days','Rollback verification')`;
 const [premium]=await tx`select public.tariff_overview(${id}) r`;check('Operator manual Premium succeeds',premium.r.plan.id==='premium');
 await fail('Operator changes require reason',()=>tx`select public.operator_set_subscription(${id},'basic','active',now(),now()+interval '30 days','')`);
 await fail('Cancellation cannot shorten paid period',()=>tx`select public.operator_set_subscription(${id},'premium','canceled',now()-interval '1 day',now()+interval '1 day','Cancel verify')`);
 await tx`select public.operator_set_subscription(${id},'premium','canceled',starts_at,period_end,'Cancellation verification') from public.subscriptions where organization_id=${id}`;
 const [cancel]=await tx`select public.tariff_overview(${id}) r`;check('Canceled subscription retains Premium',cancel.r.plan.id==='premium');
 await tx`select public.operator_set_subscription(${id},'premium','past_due',starts_at,period_end,'Past due verification') from public.subscriptions where organization_id=${id}`;
 const [due]=await tx`select public.tariff_overview(${id}) r`;check('Past due has Free permissions',due.r.plan.id==='free');
 await tx`select public.operator_set_subscription(${id},'premium','trialing',now(),now()+interval '7 days','Trial verification')`;
 await tx`select public.operator_set_subscription(${id},'free','free',now(),null,'Trial end verification')`;
 await fail('Second trial is blocked',()=>tx`select public.operator_set_subscription(${id},'premium','trialing',now(),now()+interval '7 days','Second trial verify')`);

 const [audit]=await tx`select count(*)::int n from public.subscription_audit where organization_id=${id}`;check('Administrative changes audited',audit.n>=5);
 await tx`select set_config('request.jwt.claim.sub',${crypto.randomUUID()},true)`;
 await fail('Foreign user cannot read tariff RPC',()=>tx`select public.tariff_overview(${id})`);

 const [privileges]=await tx`select has_table_privilege('authenticated','public.subscriptions','UPDATE') sub, has_table_privilege('authenticated','public.platform_operators','INSERT') op, has_function_privilege('authenticated','public.reserve_ocr(uuid,uuid,uuid,text)','EXECUTE') reserve`;
 check('No member table write grants or OCR reservation grant',!privileges.sub&&!privileges.op&&!privileges.reserve);
 const publicPlans=await tx`select * from public.tariff_plans`;check('Public catalog readable',publicPlans.length===3);
 throw new Rollback();
 });
}catch(e){if(!(e instanceof Rollback))throw e;}finally{await sql.end();}
console.log(`${checks} database checks passed; all test mutations rolled back.`);