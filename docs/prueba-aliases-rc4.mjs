import { chromium } from "playwright";
const FS="http://127.0.0.1:8080/v1/projects/apppromos/databases/(default)/documents";
const HOST="http://127.0.0.1:5000";
const fv=(v)=>v===null?{nullValue:null}:typeof v==="string"?{stringValue:v}:typeof v==="boolean"?{booleanValue:v}:typeof v==="number"?(Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}):Array.isArray(v)?{arrayValue:{values:v.map(fv)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,fv(x)]))}};
const body=(o)=>({fields:Object.fromEntries(Object.entries(o).map(([k,v])=>[k,fv(v)]))});
const put=(slug,o)=>fetch(`${FS}/publicWebSlugs/${slug}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer owner"},body:JSON.stringify(body(o))}).then(r=>r.status);

const vidriera=(id,nombre,precio)=>({businessId:id,active:true,enabled:true,published:true,mode:"web_premium",
  priceListStatus:"ready",plan:"web_premium",address:"Patagonia 28",city:"Venado Tuerto",province:"Santa Fe",
  phone:"+5493462543210",phoneKey:"3462543210",whatsapp:"3462543210",logoUrl:"",frontPhotoUrl:"",
  showPriceList:true,visibleRubros:[],publicRubroNames:{Novillo:"Novillo"},storefrontTheme:"standard",
  publicOffers:[],dailyOffers:[],businessName:nombre,publicDisplayName:nombre,
  publicProducts:[{id:"p0",nombre:"Asado",rubro:"Novillo",unidad:"kg",precio}],updatedAt:new Date().toISOString()});
const puntero=(id,slug,aliasOf)=>({businessId:id,slug,aliasOf,active:true,createdFrom:"slug_alias",updatedAt:new Date().toISOString()});

// Canonico vigente con precio de HOY
await put("carn-c", {...vidriera("biz1","Carniceria C",18900), slug:"carn-c"});
// Alias de un renombre (A -> C)
await put("carn-a", puntero("biz1","carn-a","carn-c"));
// CADENA: dos renombres. A2 -> B2 (que a su vez es alias -> C)
await put("carn-b2", puntero("biz1","carn-b2","carn-c"));
await put("carn-a2", puntero("biz1","carn-a2","carn-b2"));
// Alias estilo RC3 (copia con slug apuntando al canonico, sin aliasOf)
await put("carn-rc3", {...vidriera("biz1","Carniceria C",13500), slug:"carn-c", createdFrom:"slug_alias"});
// Alias cuyo canonico NO existe
await put("carn-huerfano", puntero("biz1","carn-huerfano","carn-inexistente"));
// Alias que intenta apropiarse de OTRO negocio
await put("carn-otro", {...vidriera("biz2","Carniceria Ajena",9999), slug:"carn-otro"});
await put("carn-ladron", puntero("biz1","carn-ladron","carn-otro"));

const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
const ctx=await b.newContext({viewport:{width:360,height:640},deviceScaleFactor:2,isMobile:true,hasTouch:true});
async function ver(slug,etiqueta){
  const p=await ctx.newPage();
  let err=null; p.on("console",m=>{if(m.type()==="error"&&!err)err=m.text().slice(0,110);});
  await p.goto(`${HOST}/${slug}`,{waitUntil:"domcontentloaded",timeout:45000});
  await p.waitForTimeout(2800);
  await p.evaluate(()=>document.getElementById("apppromosQaLocalBanner")?.remove());
  const txt=await p.evaluate(()=>document.body.innerText);
  const roto=/Error cargando web|no está disponible|no coincide/i.test(txt);
  let precio="—";
  if(!roto){
    await p.evaluate(()=>[...document.querySelectorAll("[data-store-view-target='products']")].pop()?.click());
    await p.waitForTimeout(900);
    await p.evaluate(()=>[...document.querySelectorAll("button,a")].find(x=>/Novillo \(/.test(x.innerText||""))?.click());
    await p.waitForTimeout(1100);
    const m=(await p.evaluate(()=>document.body.innerText)).match(/\$\s?[\d.]+/);
    precio=m?m[0]:"SIN PRECIO";
  }
  const nombre=(txt.match(/Carnicer[ií]a [^\n|]*/)||["?"])[0].trim().slice(0,22);
  console.log(etiqueta.padEnd(42),"|",(roto?"ERROR":"carga").padEnd(6),"|",precio.padEnd(10),"|",roto?(err||"").slice(0,60):nombre);
  await p.close();
}
console.log("caso".padEnd(42),"| estado","| precio    ","| detalle");
await ver("carn-c","CANONICO");
await ver("carn-a","ALIAS simple (1 renombre)");
await ver("carn-a2","ALIAS DE ALIAS (2 renombres)");
await ver("carn-b2","alias intermedio B2");
await ver("carn-rc3","ALIAS viejo estilo RC3");
await ver("carn-huerfano","ALIAS con canonico inexistente");
await ver("carn-ladron","ALIAS apuntando a OTRO negocio");
await b.close();
