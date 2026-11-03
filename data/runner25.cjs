
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function finalize(base44,b){const F=['name','status','owner_id','address','city','state_code','zip_code','phone','website','description','category','facebook_url','instagram_url','tiktok_url','x_url','youtube_url','threads_url','days','happy_hour_start','happy_hour_end','deals','deals_by_day'];const ph=/^(null|n\/?a|none|unknown|undefined)$/i;const viol=[];let changes=0,amenLost=0,dup=0;
 for(const before of b.snapshot.venues){const now=await base44.entities.Venue.get(before.id);const ownerProt=before.owner_id||before.verification_status==='verified';
  for(const f of F){const a=JSON.stringify(before[f]??null),c=JSON.stringify(now[f]??null);if(a===c)continue;changes++;const empty=before[f]==null||before[f]===''||(Array.isArray(before[f])&&!before[f].length);
   if(f==='status'&&now.status==='inactive'&&now.field_provenance?.activity_status==='CONFIRMED_CLOSED')continue;
   if(now[f]==null||now[f]===''||(Array.isArray(now[f])&&!now[f].length))viol.push([before.name,f,'cleared']);
   else if(typeof now[f]==='string'&&ph.test(now[f]))viol.push([before.name,f,'placeholder']);
   else if(f==='deals'&&Array.isArray(before[f])&&before[f].some(d=>!now[f].includes(d)))viol.push([before.name,f,'deal removed']);
   else if(f==='days'&&Array.isArray(before[f])&&before[f].some(d=>!now[f].includes(d)))viol.push([before.name,f,'day removed']);
   else if(!empty&&f==='address'&&now.field_provenance?.address==='google_places'&&(String(before.address).match(/\d+/)||[''])[0]===(String(now.address).match(/\d+/)||['x'])[0]){}
   else if(!empty&&!['deals','days'].includes(f))viol.push([before.name,f,'overwrote existing']);
   if(ownerProt&&!empty)viol.push([before.name,f,'owner-protected change'])}
  const am=await base44.entities.VenueAmenity.filter({venue_id:before.id});const slugs=new Set(am.map(a=>a.amenity_slug));const cnt={};am.forEach(a=>cnt[a.amenity_slug]=(cnt[a.amenity_slug]||0)+1);dup+=Object.values(cnt).filter(v=>v>1).length;
  for(const a of b.snapshot.amenities.filter(a=>a.venue_id===before.id))if(!slugs.has(a.amenity_slug)){amenLost++;viol.push([before.name,'amenity:'+a.amenity_slug,'removed'])}}
 if(dup)viol.push(['*','amenities',dup+' duplicate slugs']);
 const review=(b.results||[]).some(r=>r.disc>0||(r.hh||[]).length);
 const status=viol.length?'STOPPED_BY_SAFETY_RULE':review?'COMPLETED_WITH_REVIEW_ITEMS':'COMPLETED';
 await base44.entities.EnrichmentBatch.update(b.id,{batch_status:status,completion_time:new Date().toISOString(),integrity_result:viol.length?'FAIL: '+JSON.stringify(viol).slice(0,1500):'PASS',metrics:{...(b.metrics||{}),field_changes:changes,violations:viol.length,amenities_lost:amenLost,duplicate_slugs:dup}});
 return {finalized:b.batch_number,status,viol};}
module.exports=async function run(base44,budgetMs=95000){const t0=Date.now();
 const B=(await base44.entities.EnrichmentBatch.filter({phase_id:'2.5'},'batch_number',100)).find(b=>['RUNNING','QUEUED','STOPPED_BY_SAFETY_RULE','PAUSED_INFRASTRUCTURE'].includes(b.batch_status));
 if(!B)return {done:true};if(['STOPPED_BY_SAFETY_RULE','PAUSED_INFRASTRUCTURE'].includes(B.batch_status))return {halted:B.batch_number,status:B.batch_status,why:B.stop_reason||B.integrity_result};
 let b=B;if(b.batch_status==='QUEUED'){const snap={venues:[],amenities:[]};for(const id of b.venue_ids){const v=await base44.entities.Venue.get(id);snap.venues.push(v);snap.amenities.push(...(await base44.entities.VenueAmenity.filter({venue_id:id})).map(a=>({id:a.id,venue_id:a.venue_id,amenity_slug:a.amenity_slug,source:a.source,provenance:a.provenance})))}
  b=await base44.entities.EnrichmentBatch.update(b.id,{batch_status:'RUNNING',start_time:new Date().toISOString(),snapshot:snap});}
 const done=new Set([...(b.completed_venue_ids||[]),...(b.failed_venue_ids||[]),...(b.skipped_venue_ids||[])]);
 let pending=b.venue_ids.filter(id=>!done.has(id));if(!pending.length)return await finalize(base44,b);const res=[...(b.results||[])];const C=[...(b.completed_venue_ids||[])],F=[...(b.failed_venue_ids||[])],S=[...(b.skipped_venue_ids||[])];let infra=0;
 while(pending.length&&Date.now()-t0<budgetMs){const pair=pending.slice(0,2);pending=pending.slice(2);
  const out=await Promise.all(pair.map(id=>base44.functions.invoke('enrichAllVenuesFull',{phase:'2.5',force:true,venue_ids:[id],batch_size:1}).then(r=>r.data.results?.[0]||{venue_id:id,error:'no result'}).catch(e=>({venue_id:id,error:e.message}))));
  for(const r of out){const slim={venue_id:r.venue_id,venue_name:r.venue_name,activity:r.activity?.status,identity:r.identity?.status,structure:r.location_structure,places_matched:r.places?.matched??r.places_matched,updates:r.updates_written,fields_updated:r.fields_updated,amen_added:r.amenities_saved,auto_saved:(r.auto_saved||[]).map(a=>a.slug),places_amen:r.places_amenities,proposals:r.proposals_queued,disc:r.discrepancies_recorded,hh:(r.happy_hour_gate||[]).map(e=>e.action+':'+e.reason),amen_reasons:(r.amenity_gate||[]).map(e=>e.reason),field_gate:(r.field_gate||[]).map(e=>e.field+':'+e.decision+':'+e.reason),web:r.website_research&&{s:r.website_research.status,p:r.website_research.pages,q:r.website_research.requests,r:r.website_research.rendered,ms:r.website_research.duration_ms,err:(r.website_research.errors||[]).length},error:r.error?String(r.error).slice(0,300):undefined,set_inactive:r.set_inactive};
   res.push(slim);if(r.error){F.push(r.venue_id);if(/429|rate|quota/i.test(r.error))infra++}else if(r.skipped)S.push(r.venue_id);else C.push(r.venue_id);if((r.website_research?.errors||[]).some(e=>/HTTP_429/.test(e)))infra++}
  await base44.entities.EnrichmentBatch.update(b.id,{results:res,completed_venue_ids:C,failed_venue_ids:F,skipped_venue_ids:S});
  if(infra>=2){await base44.entities.EnrichmentBatch.update(b.id,{batch_status:'PAUSED_INFRASTRUCTURE',stop_reason:'repeated 429/quota'});return {paused:true}}}
 return {batch:b.batch_number,id:b.id,remaining:pending.length,C:C.length,F:F.length,S:S.length,ms:Date.now()-t0};};