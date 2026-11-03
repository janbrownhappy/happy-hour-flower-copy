
const fs=require('fs');
const ENT=['ActivityLog','AdCampaign','AdImpression','AmenityProposal','ArrivalDiagnosticLog','ArrivalNotificationEvent','Attribution','Beacon','CheckIn','EnrichmentDiscrepancy','Favorite','HappyHourItem','Listing','ListingIssue','LocalQuestion','OfferStat','PassInstance','ProximityEvent','QrCampaign','QrScan','Report','RetentionProfile','Review','VenueAmenity','VenueClaimRequest','VenueCollaborator','VenueCommunicationSettings','VenueCompetitor','VenueEvent','VenueFeatureOverride','VenueMessageLog','VenueNote','VenueNotification','VenueReservationLink','VenueVisit','WalletPass','WebsiteResearchLog'];
const EXTRA=[['Attribution','first_venue_id'],['FieldTestReading','test_venue_id'],['FieldTestReading','closest_venue_id'],['FieldTestSession','test_venue_id'],['LocationDiagnosticLog','closest_venue_id'],['VenueCompetitor','matched_venue_id'],['Listing','venue_ref_id'],['QrCampaign','destination_id']];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function R(fn){for(let i=0;;i++){try{return await fn()}catch(e){if(i<4&&(e.status===429||/rate|429/i.test(e.message))){await sleep(1500*2**i);continue}throw e}}}
const flat=x=>String(x||'').toLowerCase().replace(/[^a-z0-9$%]+/g,' ').trim();
const VR=/\$\s*\d+(?:\.\d+)?|\d+\s*%|\bhalf[- ]?(?:price|priced|off)\b|\bbogo\b/gi;const F=new Set(['off','price','priced','only','all','our','the','and','each','per','select','any','for','happy','hour']);
const dkey=d=>[...new Set(flat(String(d).replace(VR,' ')).replace(/\d+/g,' ').split(' ').filter(w=>w.length>2&&!F.has(w)).map(w=>w.replace(/s$/,'')))].sort().join(' ');
const dval=d=>(String(d).match(VR)||[]).map(v=>v.toLowerCase().replace(/\s/g,'')).sort().join('|');
const dig=p=>String(p||'').replace(/\D/g,'').slice(-10);const host=u=>{try{return new URL(/^http/.test(u)?u:'https://'+u).hostname.replace(/^www\./,'')}catch{return String(u||'')}};
const dist=(a,b)=>{if(a?.lat==null||b?.lat==null||!a.lng||!b.lng)return null;const r=Math.PI/180;return Math.round(Math.hypot((b.lng-a.lng)*r*Math.cos(a.lat*r),(b.lat-a.lat)*r)*6371000)};
async function related(b44,ids){const out={};for(const e of ENT){try{out[e+'.venue_id']=await R(()=>b44.entities[e].filter({venue_id:{$in:ids}},'-created_date',5000))}catch(x){out[e+'.venue_id']={error:x.message}}}
for(const [e,f] of EXTRA){try{out[e+'.'+f]=await R(()=>b44.entities[e].filter({[f]:{$in:ids}},'-created_date',5000))}catch(x){out[e+'.'+f]={error:x.message}}}return out;}
function richness(v,rel){const n=k=>(rel[k]||[]).length;return (v.owner_id?1e6:0)+(n('Favorite')+n('VenueVisit')+n('Review')+n('CheckIn')+n('VenueClaimRequest')+n('VenueCollaborator'))*1000+(v.field_provenance?.identity==='hhf_admin'?500:0)+(v.contacts_verified?200:0)+(v.status==='active'?100:0)+n('VenueAmenity')*3+(v.deals||[]).length*5+(v.photo_urls||[]).length*4+['phone','website','description','happy_hour_start','instagram_url','facebook_url','zip_code','area_id'].filter(k=>v[k]).length*5+(v.view_count||0)/10;}
async function mergePair(b44,pair,G,cls,evidence){
 const ids=[pair[0],pair[1]];const vs=await Promise.all(ids.map(id=>R(()=>b44.entities.Venue.get(id))));
 if(vs.some(v=>v.status==='inactive'&&v.field_provenance?.merged_into))return {skipped:'already merged',ids};
 const relAll=await related(b44,ids);const errs=Object.entries(relAll).filter(([k,v])=>v.error).map(([k,v])=>k+': '+v.error);
 const relFor=id=>{const o={};for(const [k,l] of Object.entries(relAll)){if(!Array.isArray(l))continue;const f=k.split('.')[1];o[k.split('.')[0]]=(o[k.split('.')[0]]||[]).concat(l.filter(r=>r[f]===id))}return o};
 const rA=relFor(vs[0].id),rB=relFor(vs[1].id);
 if(vs[0].owner_id&&vs[1].owner_id&&vs[0].owner_id!==vs[1].owner_id)return {skipped:'two different owners',ids};
 const sA=richness(vs[0],rA),sB=richness(vs[1],rB);const [C,D]=sA>=sB?[vs[0],vs[1]]:[vs[1],vs[0]];const rD=C===vs[0]?rB:rA;const rC=C===vs[0]?rA:rB;
 const reason=C.owner_id?'owner-claimed record':(sA===sB?'tie — kept record with more relationships/data (equal), first':'stronger relationships/verified identity/richer validated data')+' (score '+Math.round(Math.max(sA,sB))+' vs '+Math.round(Math.min(sA,sB))+')';
 const snapshot={canonical:C,retired:D,related:Object.fromEntries(Object.entries(relAll).filter(([k,v])=>Array.isArray(v)&&v.length))};
 const up={};const fields=[];const conflicts=[];const disc=[];
 const addDisc=(field,cur,prop,why)=>{disc.push({venue_id:C.id,venue_name:C.name,field,current_value:typeof cur==='string'?cur:JSON.stringify(cur),current_source:C.field_provenance?.[field]||'',proposed_value:typeof prop==='string'?prop:JSON.stringify(prop),proposed_source:'duplicate_merge',evidence:'From retired duplicate '+D.name+' ('+D.id+')',reason:why,origin_function:'phase242_merge',detected_at:new Date().toISOString(),status:'pending'});conflicts.push(field+': '+why);};
 const fill=(k,eq)=>{const c=C[k],d=D[k];if(d==null||d===''||(Array.isArray(d)&&!d.length))return;if(c==null||c===''||(Array.isArray(c)&&!c.length)){up[k]=d;fields.push(k);return}if(eq&&!eq(c,d))addDisc(k,c,d,'MERGE_CONFLICT — canonical value kept; duplicate differs');};
 fill('phone',(a,b)=>dig(a)===dig(b));fill('website',(a,b)=>host(a)===host(b));fill('zip_code',(a,b)=>String(a).slice(0,5)===String(b).slice(0,5));
 for(const k of ['city','state_code','state_id','market_id','market_name','area','area_id','neighborhood','category','price_level','w3w_address','brand_id','brand_name','happy_hour_start','happy_hour_end','reservation_policy','notes','source_url'])fill(k);
 if(!C.address&&D.address){up.address=D.address;fields.push('address')}
 for(const k of ['facebook_url','instagram_url','tiktok_url','threads_url','youtube_url','x_url'])fill(k,(a,b)=>flat(a).replace(/ /g,'')===flat(b).replace(/ /g,''));
 if(!C.description&&D.description){up.description=D.description;fields.push('description')}else if(C.description&&D.description&&flat(C.description)!==flat(D.description)&&D.description.length>C.description.length*1.5)addDisc('description',C.description,D.description,'DESCRIPTION_PROTECTED — duplicate has a longer description; review proposal');
 for(const k of ['venue_type_ids','cuisine_ids','tags','editor_ids','amenities_raw']){const u=[...new Set([...(C[k]||[]),...(D[k]||[])])];if(u.length>(C[k]||[]).length){up[k]=u;fields.push(k)}}
 // days
 if((D.days||[]).length){const cd=C.days||[];if(!cd.length){up.days=D.days;fields.push('days')}else if([...D.days].sort().join()!==[...cd].sort().join())addDisc('days',cd,D.days,'HAPPY_HOUR_DAY_CONFLICT — duplicate lists different days; canonical kept');}
 if(C.happy_hour_start&&D.happy_hour_start&&(C.happy_hour_start!==D.happy_hour_start||C.happy_hour_end!==D.happy_hour_end))addDisc('happy_hour_times',C.happy_hour_start+'-'+C.happy_hour_end,D.happy_hour_start+'-'+D.happy_hour_end,'HAPPY_HOUR_TIME_CONFLICT — canonical kept');
 // deals
 const dealsAdded=[];const mergeDeals=(cur,inc,label)=>{const out=[...cur];for(const d of inc){if(typeof d!=='string')continue;const k=dkey(d),v=dval(d);const same=out.find(e=>typeof e==='string'&&(flat(e)===flat(d)||(k&&dkey(e)===k&&dval(e)===v)));if(same)continue;const conf=out.find(e=>typeof e==='string'&&k&&dkey(e)===k&&dval(e)&&v&&dval(e)!==v);if(conf){addDisc('happy_hour_deal_conflict:'+k,conf,d,'HAPPY_HOUR_DEAL_CONFLICT ('+label+') exposed by duplicate merge — not copied');continue}out.push(d);dealsAdded.push(label+': '+d)}return out};
 const nd=mergeDeals(C.deals||[],D.deals||[],'deals');if(nd.length>(C.deals||[]).length){up.deals=nd;fields.push('deals')}
 const dbd={...(C.deals_by_day||{})};let dbdCh=false;for(const [day,l] of Object.entries(D.deals_by_day||{})){if(!Array.isArray(l))continue;const cur=Array.isArray(dbd[day])?dbd[day]:[];const m=mergeDeals(cur,l,day);if(m.length>cur.length){dbd[day]=m;dbdCh=true}}if(dbdCh){up.deals_by_day=dbd;fields.push('deals_by_day')}
 if(!C.day_schedules&&D.day_schedules){up.day_schedules=D.day_schedules;fields.push('day_schedules')}
 // photos
 const pu=[...(C.photo_urls||[])],pp=[...(C.photo_provenance||[])];while(pp.length<pu.length)pp.push('');let photos=0;(D.photo_urls||[]).forEach((u,i)=>{if(u&&!pu.includes(u)&&!/placeholder/i.test(D.photo_provenance?.[i]||'')){pu.push(u);pp.push(D.photo_provenance?.[i]||'');photos++}});
 if(photos){up.photo_urls=pu;up.photo_provenance=pp;fields.push('photo_urls');if(C.photo_needs_manual)up.photo_needs_manual=false}
 if(C.has_happy_hour!==true&&D.has_happy_hour===true){up.has_happy_hour=true;fields.push('has_happy_hour')}
 up.view_count=(C.view_count||0)+(D.view_count||0);up.favorite_count=(C.favorite_count||0)+(D.favorite_count||0);
 if(!C.owner_id&&D.owner_id){return {skipped:'retired would carry owner',ids}}
 // coordinates
 const g=G[C.id]||G[D.id];const num=(String(C.address||D.address||'').match(/\d{1,6}/)||[''])[0];let coordSel,coordSrc,coordChanged=null;
 if(g&&g.lat&&(!num||String(g.addr).includes(num))){const dc=dist(C,g);coordSrc='Google Places '+g.place_id+' ('+g.addr+')';if(dc==null||dc>50){coordChanged={old:C.lat!=null?C.lat.toFixed(6)+','+C.lng.toFixed(6):'none',new:g.lat.toFixed(6)+','+g.lng.toFixed(6),retired:D.lat!=null?D.lat.toFixed(6)+','+D.lng.toFixed(6):'none'};up.lat=g.lat;up.lng=g.lng}coordSel=g.lat.toFixed(6)+','+g.lng.toFixed(6)}
 else{coordSel=C.lat!=null?C.lat+','+C.lng:'none';coordSrc='unvalidated';addDisc('coordinates',coordSel,D.lat+','+D.lng,'COORDINATE_REVIEW_REQUIRED — no address-matched Google location')}
 up.field_provenance={...(C.field_provenance||{}),merged_from:[...((C.field_provenance||{}).merged_from||[]),D.id]};
 // repoint relationships
 const moved={};const amenMoved=[];const cSlugs=new Set((rC.VenueAmenity||[]).map(a=>a.amenity_slug));const removedDup={};
 for(const [k,l] of Object.entries(relAll)){if(!Array.isArray(l))continue;const [e,f]=k.split('.');for(const r of l.filter(r=>r[f]===D.id)){
  if(e==='VenueAmenity'){if(cSlugs.has(r.amenity_slug)){await R(()=>b44.entities.VenueAmenity.delete(r.id));removedDup.VenueAmenity=(removedDup.VenueAmenity||0)+1;continue}cSlugs.add(r.amenity_slug);amenMoved.push(r.amenity_slug)}
  if((e==='Favorite'||e==='VenueCollaborator')&&(relAll[e+'.venue_id']||[]).some(x=>x.venue_id===C.id&&(x.user_id||x.created_by_id)===(r.user_id||r.created_by_id))){await R(()=>b44.entities[e].delete(r.id));removedDup[e]=(removedDup[e]||0)+1;continue}
  if(e==='QrCampaign'&&f==='destination_id'&&r.destination_type!=='venue')continue;
  const patch={[f]:C.id};if('venue_name' in r&&f==='venue_id')patch.venue_name=C.name;await R(()=>b44.entities[e].update(r.id,patch));moved[e]=(moved[e]||0)+1;}}
 await R(()=>b44.entities.Venue.update(C.id,up));
 if(disc.length)await R(()=>b44.entities.EnrichmentDiscrepancy.bulkCreate(disc));
 await R(()=>b44.entities.Venue.update(D.id,{status:'inactive',field_provenance:{...(D.field_provenance||{}),merged_into:C.id,merged_at:new Date().toISOString()}}));
 const log={canonical_venue_id:C.id,retired_venue_id:D.id,canonical_name:C.name,retired_name:D.name,classification:cls,identity_evidence:evidence+(g?'; same Google Place '+g.place_id:''),canonical_reason:reason,fields_transferred:fields,amenities_transferred:amenMoved,deals_transferred:dealsAdded,photos_transferred:photos,relationships_transferred:{...moved,duplicates_removed:removedDup},conflicts,coordinates_selected:coordSel,coordinate_source:coordSrc,pre_merge_snapshot:snapshot,status:'merged',merged_at:new Date().toISOString()};
 await R(()=>b44.entities.VenueMergeLog.create(log));
 return {C:[C.id,C.name,!!C.owner_id],D:[D.id,D.name,!!D.owner_id],cls,reason,fields,amen:amenMoved.length,deals:dealsAdded.length,photos,moved,removedDup,conflicts,coordChanged,coordSrc,errs};}
module.exports={mergePair,related};