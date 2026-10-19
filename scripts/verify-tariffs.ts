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

 await tx`insert into public.transactions(organization_id,type,amount,booking_date,category,created_by) values(${id},'expense',1,current_date,'Sonstiges',${user})`;
 for(let n=1;n<50;n++) await tx`insert into public.transactions(organization_id,type,amount,booking_date,category,created_by) values(${id},'expense',1,current_date,'Sonstiges',${user})`;
 await fail('Free booking limit denies 51st manual row',()=>tx`insert into public.transactions(organization_id,type,amount,booking_date,category,created_by) values(${id},'expense',1,current_date,'Sonstiges',${user})`);
 const [rec]=await tx`insert into public.fixed_costs(user_id,organization_id,name,amount,category,interval,due_day,start_date) values(${user},${id},'Verification recurring',1,'Sonstiges','monatlich',1,current_date) returning id`;
 await fail('Forged recurring link cannot bypass manual limit',()=>tx`insert into public.transactions(organization_id,type,amount,booking_date,category,recurring_expense_id,recurring_period,created_by) values(${id},'expense',1,current_date,'Sonstiges',${rec.id},current_date,${user})`);
 const [book]=await tx`select public.book_due_recurring_expenses(${id}) n`;check('Recurring RPC excluded from manual limit',book.n===1);
 const [repeat]=await tx`select public.book_due_recurring_expenses(${id}) n`;check('Recurring retry cannot double book',repeat.n===0);

 await tx`select set_config('request.jwt.claim.sub',${crypto.randomUUID()},true)`;
 await fail('Foreign user cannot read tariff RPC',()=>tx`select public.tariff_overview(${id})`);
 const [privileges]=await tx`select has_table_privilege('authenticated','public.subscriptions','UPDATE') sub, has_table_privilege('authenticated','public.platform_operators','INSERT') op, has_function_privilege('authenticated','public.reserve_ocr(uuid,uuid,uuid,text)','EXECUTE') reserve`;
 check('No member table write grants or OCR reservation grant',!privileges.sub&&!privileges.op&&!privileges.reserve);
 const publicPlans=await tx`select * from public.tariff_plans`;check('Public catalog readable',publicPlans.length===3);
 throw new Rollback();
 });
}catch(e){if(!(e instanceof Rollback))throw e;}finally{await sql.end();}
console.log(`${checks} database checks passed; all test mutations rolled back.`);