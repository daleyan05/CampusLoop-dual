const appState={view:"home",category:"all",location:{country:"",countryName:"",city:""},locationSource:"none",loggedIn:false,userId:"",userName:"游客",userEmail:"",identitySubmitted:false,tutorMode:"student",mentorAccount:null};
let mentorCloudRequests=[];
let mentorCloudRequestsPromise=null;
const commerce=globalThis.CampusLoopCommerce;
const cloudAuth=globalThis.CampusLoopMarketCloud;
const platformCloud=globalThis.CampusLoopPlatformCloud;
let cloudAuthMode="unavailable";
let cloudAuthReady=Promise.resolve({mode:"unavailable",user:null});
let cloudMarketUnsubscribe=null;
let cloudMarketRefreshPromise=null;
let platformCloudMode="unavailable";
let platformCloudReady=Promise.resolve({mode:"unavailable",user:null});
const countryCodes="AF,AL,DZ,AD,AO,AG,AR,AM,AU,AT,AZ,BS,BH,BD,BB,BY,BE,BZ,BJ,BT,BO,BA,BW,BR,BN,BG,BF,BI,CV,KH,CM,CA,CF,TD,CL,CN,CO,KM,CG,CR,CI,HR,CU,CY,CZ,CD,DK,DJ,DM,DO,EC,EG,SV,GQ,ER,EE,SZ,ET,FJ,FI,FR,GA,GM,GE,DE,GH,GR,GD,GT,GN,GW,GY,HT,HN,HU,IS,IN,ID,IR,IQ,IE,IL,IT,JM,JP,JO,KZ,KE,KI,KP,KR,KW,KG,LA,LV,LB,LS,LR,LY,LI,LT,LU,MG,MW,MY,MV,ML,MT,MH,MR,MU,MX,FM,MD,MC,MN,ME,MA,MZ,MM,NA,NR,NP,NL,NZ,NI,NE,NG,MK,NO,OM,PK,PW,PA,PG,PY,PE,PH,PL,PT,QA,RO,RU,RW,KN,LC,VC,WS,SM,ST,SA,SN,RS,SC,SL,SG,SK,SI,SB,SO,ZA,SS,ES,LK,SD,SR,SE,CH,SY,TJ,TZ,TH,TL,TG,TO,TT,TN,TR,TM,TV,UG,UA,AE,GB,US,UY,UZ,VU,VE,VN,YE,ZM,ZW,PS,VA".split(",");
const locationCatalog=globalThis.CAMPUSLOOP_LOCATION_DATA||{};
const regionNamesZh=new Intl.DisplayNames(["zh-CN"],{type:"region"});
const regionNamesEn=new Intl.DisplayNames(["en"],{type:"region"});
const countryEntries=countryCodes.map(code=>({code,zh:regionNamesZh.of(code)||code,en:regionNamesEn.of(code)||code})).sort((a,b)=>a.zh.localeCompare(b.zh,"zh-CN"));
const majorCatalog={
"商业、管理与金融":["会计学","金融学","金融工程","经济学","商业经济学","工商管理","国际商务","市场营销","人力资源管理","供应链管理","物流管理","运营管理","项目管理","创业管理","电子商务","商业分析","风险管理","保险学","房地产管理","酒店管理","旅游管理","体育管理","奢侈品管理","公共关系"],
"计算机、数据与信息技术":["计算机科学","软件工程","人工智能","机器学习","数据科学","数据分析","网络安全","信息安全","信息系统","信息技术","云计算","大数据技术","区块链","游戏开发","人机交互","计算机图形学","移动应用开发","网络工程","物联网工程","机器人学","计算语言学","生物信息学","商业信息系统"],
"工程与制造":["机械工程","电子工程","电气工程","土木工程","化学工程","航空航天工程","汽车工程","材料工程","工业工程","制造工程","机电一体化","通信工程","控制工程","能源工程","核工程","石油工程","采矿工程","海洋工程","船舶工程","环境工程","生物医学工程","农业工程","结构工程","交通工程","工程管理","产品设计工程"],
"自然科学与数学":["数学","应用数学","统计学","精算学","物理学","应用物理学","化学","应用化学","生物学","生物化学","微生物学","分子生物学","遗传学","生物技术","神经科学","地质学","地球科学","地理学","气象学","大气科学","海洋科学","天文学","环境科学","食品科学","法医学","纳米科学"],
"医学、健康与生命科学":["临床医学","基础医学","护理学","药学","药理学","公共卫生","流行病学","牙医学","兽医学","营养学","运动科学","物理治疗","职业治疗","言语治疗","医学影像","医学检验","助产学","健康管理","心理健康","生物医学科学","解剖学","生理学","免疫学","眼视光学","中医学","康复科学"],
"社会科学与心理学":["心理学","社会学","社会工作","人类学","政治学","国际关系","公共政策","公共管理","发展研究","城市研究","人口学","犯罪学","性别研究","区域研究","和平与冲突研究","行为科学","认知科学","社会政策","政治经济学"],
"法律与司法":["法学","商法","公司法","国际法","知识产权法","刑法","民法","人权法","环境法","海商法","税法","金融法","仲裁与争议解决","法律与科技","犯罪司法","警务与安全研究"],
"教育与教学":["教育学","幼儿教育","小学教育","中学教育","特殊教育","英语教育","数学教育","科学教育","教育心理学","教育技术","课程与教学","教育管理","高等教育","语言教育","体育教育","职业教育","国际教育","教育评估"],
"人文、语言与文化":["英语语言文学","汉语言文学","语言学","应用语言学","翻译学","历史学","哲学","宗教学","古典学","考古学","文化研究","比较文学","创意写作","伦理学","亚洲研究","欧洲研究","中东研究","非洲研究","拉丁美洲研究","博物馆学","档案学"],
"传媒、新闻与传播":["传播学","新闻学","数字媒体","媒体研究","广告学","广播电视","影视制作","电影研究","出版学","新媒体","社交媒体","视觉传播","战略传播","科学传播","体育传播","纪录片制作"],
"艺术、设计与表演":["平面设计","视觉传达设计","交互设计","用户体验设计","工业设计","产品设计","服装设计","室内设计","动画","插画","摄影","纯艺术","美术史","音乐学","音乐制作","戏剧","舞蹈","表演","影视表演","编剧","导演","游戏艺术","创意产业管理"],
"建筑、规划与环境":["建筑学","景观建筑","城市规划","区域规划","室内建筑","建筑技术","建筑管理","房地产与测量","工料测量","物业管理","可持续设计","环境规划","城市设计","交通规划","地理信息系统","测绘工程"],
"农业、食品与动物科学":["农业科学","农学","园艺学","植物科学","动物科学","林业","渔业科学","水产养殖","土壤科学","农业经济学","食品技术","食品安全","酿造科学","葡萄栽培","动物营养","野生动物保护","可持续农业"],
"公共服务与安全":["应急管理","消防科学","国家安全","情报研究","军事研究","公共安全","灾害管理","移民研究","海关管理","社区发展","非营利组织管理"],
"跨学科与新兴领域":["可持续发展","环境、社会与治理","金融科技","教育科技","健康科技","城市科技","数字人文","科技与社会","创新管理","设计思维","全球研究","自由学科","通识教育","哲学、政治与经济","计算社会科学","气候变化研究"]};
const items=[
{id:1,title:"IKEA 台灯 · 几乎全新",category:"生活用品",price:35,currency:"RM",currencyCode:"MYR",country:"MY",city:"Kuala Lumpur",seller:"Maya",avatar:"M",tone:"mint",icon:"lamp-desk",image:"https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1200&q=85",description:"暖光护眼，带原包装，适合宿舍书桌。",age:"2 小时前"},
{id:2,title:"Business Analytics 教材",category:"教材书籍",price:28,currency:"RM",currencyCode:"MYR",country:"MY",city:"Kuala Lumpur",seller:"Daniel",avatar:"D",tone:"peach",icon:"book-open",image:"https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=1200&q=85",description:"第 5 版，笔记很少，课程结束后闲置。",age:"昨天"},
{id:3,title:"可折叠学习书桌",category:"家具家居",price:60,currency:"RM",currencyCode:"MYR",country:"MY",city:"Petaling Jaya",seller:"Sofia",avatar:"S",tone:"lilac",icon:"table-2",image:"https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=85",description:"搬家出，桌面干净，适合小空间。",age:"2 天前"},
{id:4,title:"Logitech 无线键盘",category:"数码电器",price:45,currency:"RM",currencyCode:"MYR",country:"MY",city:"Kuala Lumpur",seller:"Alex",avatar:"A",tone:"coral",icon:"keyboard",image:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1200&q=85",description:"蓝牙连接稳定，电池续航很好。",age:"3 天前"},
{id:5,title:"宿舍收纳篮套装",category:"生活用品",price:18,currency:"RM",currencyCode:"MYR",country:"MY",city:"George Town",seller:"Nina",avatar:"N",tone:"mint",icon:"archive",image:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=85",description:"三个尺寸，适合衣柜和书桌收纳。",age:"4 天前"},
{id:6,title:"Academic Writing 讲义",category:"教材书籍",price:12,currency:"RM",currencyCode:"MYR",country:"MY",city:"Kuala Lumpur",seller:"Leo",avatar:"L",tone:"peach",icon:"file-text",image:"https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=1200&q=85",description:"课程整理版，重点和范例都在。",age:"5 天前"}
];
const mentorRequests=[
{schemaVersion:2,id:"sample-marketing",subject:"Marketing Strategy",type:"作业辅导",deadline:"8 月 28 日",addressSnapshot:{countryCode:"MY",countryName:"马来西亚",city:"Kuala Lumpur"},currencyCode:"MYR",file:"PDF"},
{schemaVersion:2,id:"sample-writing",subject:"Academic Writing",type:"论文结构梳理",deadline:"9 月 02 日",addressSnapshot:{countryCode:"MY",countryName:"马来西亚",city:"Petaling Jaya"},currencyCode:"MYR",file:"DOCX"},
{schemaVersion:2,id:"sample-statistics",subject:"Statistics",type:"课程答疑",deadline:"8 月 30 日",addressSnapshot:{countryCode:"MY",countryName:"马来西亚",city:"Kuala Lumpur"},currencyCode:"MYR",file:"XLSX"},
{schemaVersion:2,id:"sample-ux",subject:"UX Research",type:"作业辅导",deadline:"9 月 05 日",addressSnapshot:{countryCode:"MY",countryName:"马来西亚",city:"George Town"},currencyCode:"MYR",file:"PPTX"}
];
const tutorStorage={requests:"campusLoopTutorRequests",request:"campusLoopTutorRequest",quotes:"campusLoopTutorQuotes",quote:"campusLoopTutorQuote",selected:"campusLoopTutorQuoteSelected",approved:"campusLoopTutorQuoteApproved",review:"campusLoopTutorQuoteReview",matchReviews:"campusLoopTutorMatchReviews",messages:"campusLoopTutorMessages"};
const mentorSessionStorageKey="campusLoopMentorSession";
const authSessionStorageKey="campusLoopAuthSession";
const authSessionMaxAgeMs=30*24*60*60*1000;
const mentorAccounts=Object.freeze({
  Lessured:Object.freeze({id:"mentor-lessured",username:"Lessured",salt:"d1f3a46b22dc80c457698ddb3d99e22e",passwordHash:"480d418d2dd331b04873e922aff3be3d8726f20b36bc0f1af5e66d37b8f9a4cd"}),
  Lessures:Object.freeze({id:"mentor-lessures",username:"Lessures",salt:"e0076f303f4652dd66582a418dfb3748",passwordHash:"2e66de9cb42033193325e96825ee931fe735558dfe569faa95ef604815ed39e6"})
});
const addressStorageKey="campusLoopAddresses";
const legacyDemoAddresses=[{id:"home-klcc",label:"住处",name:"KLCC",country:"MY",city:"Kuala Lumpur",detail:"Jalan Ampang",postalCode:"50450",isDefault:true},{id:"school-um",label:"学校",name:"University of Malaya",country:"MY",city:"Kuala Lumpur",detail:"Lembah Pantai",postalCode:"50603",isDefault:false}];
const initialAddresses=[{id:"home-beijing",label:"住处",name:"北京住处",country:"CN",city:"Beijing",detail:"北京市朝阳区",postalCode:"100020",isDefault:true},{id:"school-beijing",label:"学校",name:"校园地址",country:"CN",city:"Beijing",detail:"北京市海淀区",postalCode:"100080",isDefault:false}];
const publishedItemStorageKey="campusLoopPublishedItems";
const publishedItemReviewStorageKey="campusLoopPublishedItemReviews";
const identityApplicationStorageKey="campusLoopIdentityApplications";
const identityReviewStorageKey="campusLoopIdentityReviews";
const accountRestrictionStorageKey="campusLoopAccountRestrictions";
const userDirectoryStorageKey="campusLoopUserDirectory";
const identityAllowedTypes=new Set(["image/jpeg","image/png","image/webp","application/pdf"]);
const identityMaxFileSize=8*1024*1024;
const postFallbackImage="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=85";
let postImages=[];
// Keep the compressed data URL for the local preview, but retain the original
// File objects for v2 Storage uploads. A data URL is not accepted by the
// server-side upload validator and must never be used as the cloud payload.
let postImageFiles=[];
let marketPostSubmitting=false;
let identityDocumentState=null;
let identityFileReadToken=0;
const $=(selector,root=document)=>root.querySelector(selector);const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
function renderIcons(){if(window.lucide?.createIcons)window.lucide.createIcons({attrs:{"aria-hidden":"true",focusable:"false"}})}
function showToast(message,icon="check-circle-2"){const region=$("#toastRegion"),toast=document.createElement("div");toast.className="toast";toast.innerHTML=`<i data-lucide="${icon}"></i><span>${message}</span>`;region.append(toast);renderIcons();window.setTimeout(()=>toast.remove(),3400)}
function openModal(id){const modal=document.getElementById(id);if(modal){modal._returnFocus=document.activeElement;modal.hidden=false;document.body.style.overflow="hidden";requestAnimationFrame(()=>{const field=modal.querySelector("input:not([type='hidden']):not([disabled]),select:not([disabled]),textarea:not([disabled])"),fallback=modal.querySelector("button:not([disabled])");(field||fallback)?.focus({preventScroll:true})})}}
function closeModal(id){const modal=document.getElementById(id);if(modal){const returnFocus=modal._returnFocus;modal.hidden=true;document.body.style.overflow="";if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});delete modal._returnFocus}}
function goToView(view){appState.view=view;$$('[data-view-panel]').forEach(panel=>panel.classList.toggle("active",panel.dataset.viewPanel===view));$$('[data-view]').forEach(button=>button.classList.toggle("active",button.dataset.view===view||(["marketPost","product"].includes(view)&&button.dataset.view==="market")));window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});if(view!=="product")history.replaceState(null,"",view==="marketPost"?"#market/post":`#${view}`)}
function applyRouteFromLocation(){const route=String(location.hash||"").replace(/^#/,"")||"home";const productMatch=route.match(/^market\/item\/([^/]+)$/);if(productMatch){showProduct(productMatch[1]);return}if(route==="market/post"){goToView("marketPost");return}if(["home","market","tutoring","settings"].includes(route))goToView(route)}
function accountUserId(name=appState.userName){if(arguments.length===0&&appState.userId)return appState.userId;const slug=String(name||"").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g,"-").replace(/^-|-$/g,"");return `local-${slug||"user"}`}
function getAccountRestrictions(){const restrictions=readStoredJson(accountRestrictionStorageKey,{});return restrictions&&typeof restrictions==="object"&&!Array.isArray(restrictions)?restrictions:{}}
function activeAccountRestriction(userId){const restriction=getAccountRestrictions()[userId];if(!restriction||restriction.status!=="banned")return null;if(restriction.expiresAt&&Date.parse(restriction.expiresAt)<=Date.now())return null;return restriction}
function accountRestrictionMessage(restriction){const until=restriction.expiresAt?`至 ${new Date(restriction.expiresAt).toLocaleString("zh-CN",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}`:"永久";return `该账户已被平台封禁（${until}）。原因：${restriction.reason||"违反平台规则"}。如有异议，请联系客服。`}
function authStores(){const stores=[];try{if(globalThis.localStorage)stores.push(globalThis.localStorage)}catch{}try{if(globalThis.sessionStorage)stores.push(globalThis.sessionStorage)}catch{}return stores}
function readAuthSession(){for(const store of authStores()){try{const session=JSON.parse(store.getItem(authSessionStorageKey)||"null");if(!session||typeof session!=="object"||!session.userId||!session.name)continue;const issuedAt=Date.parse(session.issuedAt||"");if(!issuedAt||Date.now()-issuedAt>authSessionMaxAgeMs){store.removeItem(authSessionStorageKey);continue}return session}catch{}}return null}
function persistAuthSession(){const session={version:1,userId:accountUserId(),name:appState.userName,contact:appState.userEmail,issuedAt:new Date().toISOString()},serialized=JSON.stringify(session);let saved=false;for(const store of authStores()){try{store.setItem(authSessionStorageKey,serialized);saved=true}catch{}}return saved}
function applyAuthSession(session,{refresh=true}={}){if(!session?.userId||!session.name)return false;appState.loggedIn=true;appState.userId=String(session.userId);appState.userName=String(session.name);appState.userEmail=String(session.contact||"");if(refresh){updateAccount();useAccountDefaultLocation();rememberCurrentUser(appState.userEmail)}return true}
function applyCloudAuthUser(user){if(!user?.id)return false;appState.loggedIn=true;appState.userId=String(user.id);appState.userName=String(user.name||user.email||"CampusLoop 用户");appState.userEmail=String(user.email||"");persistAuthSession();updateAccount();useAccountDefaultLocation();rememberCurrentUser(appState.userEmail);ensureCloudMarketSubscription();return true}
async function hydrateCloudMarketItems({refresh=true}={}){
  if(cloudAuthMode!=="v2"||typeof cloudAuth?.listItems!=="function")return [];
  if(!hasBrowseLocation()){
    for(let index=items.length-1;index>=0;index-=1)if(items[index]?.cloud)items.splice(index,1);
    if(refresh)renderMarket();
    return [];
  }
  if(cloudMarketRefreshPromise)return cloudMarketRefreshPromise;
  const countryCode=appState.location.country,city=appState.location.city;
  cloudMarketRefreshPromise=(async()=>{
    const rows=await cloudAuth.listItems({countryCode,city});
    const cloudIds=new Set(rows.map(row=>String(row.id)));
    for(let index=items.length-1;index>=0;index-=1){if(items[index]?.cloud&&!cloudIds.has(String(items[index].id)))items.splice(index,1)}
    rows.forEach(row=>{
      const existing=items.find(item=>String(item.id)===String(row.id));
      const localImage=existing?.image&&existing.image!==postFallbackImage?existing.image:"";
      const merged={...row,cloud:true,reviewRequired:false,reviewStatus:"approved",image:row.image||localImage||postFallbackImage,seller:row.seller||row.sellerName||"CampusLoop 用户",sellerName:row.sellerName||row.seller||"CampusLoop 用户",countryCode:row.countryCode||row.country,country:row.countryCode||row.country};
      if(existing)Object.assign(existing,merged);else items.push(merged);
    });
    if(refresh)renderMarket();
    return rows;
  })().catch(error=>{console.warn("CampusLoop market feed refresh failed",error);return []}).finally(()=>{cloudMarketRefreshPromise=null});
  return cloudMarketRefreshPromise;
}
function ensureCloudMarketSubscription(){if(cloudAuthMode!=="v2"||typeof cloudAuth?.subscribe!=="function"||cloudMarketUnsubscribe)return;cloudMarketUnsubscribe=cloudAuth.subscribe(()=>hydrateCloudMarketItems())}
async function initializeCloudAuth(){if(!cloudAuth?.configured)return {mode:"unavailable",user:null};try{const result=await cloudAuth.init();cloudAuthMode=result.mode||"unavailable";if(result.user)applyCloudAuthUser(result.user);if(cloudAuthMode==="v2"){ensureCloudMarketSubscription();await hydrateCloudMarketItems({refresh:true})}renderTutorWorkflow();return result}catch(error){console.warn("CampusLoop user auth cloud probe failed",error);cloudAuthMode="unavailable";renderTutorWorkflow();return {mode:cloudAuthMode,user:null}}}
async function initializePlatformCloud(){
  if(!platformCloud?.configured){platformCloudMode="unavailable";return {mode:platformCloudMode,user:null}}
  try{
    await cloudAuthReady;
    const result=await platformCloud.init();
    platformCloudMode=result.mode||"unavailable";
    if(appState.mentorAccount?.cloud){
      const access=platformCloudMode==="v2"&&result.user?.id?await platformCloud.checkRole("mentor"):null;
      if(!access?.authorized){
        try{sessionStorage.removeItem(mentorSessionStorageKey)}catch{}
        appState.mentorAccount=null;
      }
    }
    if(platformCloudMode==="v2"&&result.user?.id){
      const addresses=await platformCloud.listAddresses();
      localStorage.setItem(addressStorageKey,JSON.stringify(addresses));
      syncDefaultAddress();
      renderAddressBook();
      const identity=await platformCloud.getIdentityApplication();
      if(identity){
        const existing=getIdentityApplications().filter(entry=>entry.id!==identity.id);
        localStorage.setItem(identityApplicationStorageKey,JSON.stringify([identity,...existing]));
        renderIdentityStatus();
      }
      if(typeof platformCloud.listStudentTutoring==="function"){
        const tutoring=await platformCloud.listStudentTutoring();
        hydrateCloudTutoring(tutoring);
      }
    }
    renderTutorWorkflow();
    return result;
  }catch(error){
    console.warn("CampusLoop account cloud probe failed",error);
    platformCloudMode="unavailable";
    return {mode:platformCloudMode,user:null};
  }
}
function refreshPlatformCloudForCurrentUser(){
  platformCloudReady=initializePlatformCloud();
  return platformCloudReady;
}
function hydrateAuthSession(){const session=readAuthSession();if(!session)return false;const restriction=activeAccountRestriction(session.userId);if(restriction){for(const store of authStores()){try{store.removeItem(authSessionStorageKey)}catch{}}return false}return applyAuthSession(session,{refresh:false})}
function clearCurrentUser({broadcast=true}={}){cloudMarketUnsubscribe?.();cloudMarketUnsubscribe=null;appState.loggedIn=false;appState.userId="";appState.userName="游客";appState.userEmail="";if(broadcast){for(const store of authStores()){try{store.removeItem(authSessionStorageKey)}catch{}}}clearAppLocation();updateAccount()}
function enforceCurrentUserRestriction(){if(!appState.loggedIn)return false;const restriction=activeAccountRestriction(accountUserId());if(!restriction)return false;clearCurrentUser();showToast("账户已被封禁，当前登录已退出","ban");return true}
function rememberCurrentUser(identifier){const now=new Date().toISOString(),id=accountUserId(),directory=readStoredJson(userDirectoryStorageKey,[]),users=Array.isArray(directory)?directory.filter(user=>user&&user.id):[],previous=users.find(user=>user.id===id),address=accountDefaultAddress(),location=address?`${address.city} · ${commerce.countryName(address.country)}`:"未设置";const current={id,name:appState.userName,contact:identifier||appState.userEmail||"未填写",role:"普通用户",location,joinedAt:previous?.joinedAt||now,lastActiveAt:now};localStorage.setItem(userDirectoryStorageKey,JSON.stringify([current,...users.filter(user=>user.id!==id)]))}
function storedUserForContact(identifier){const normalized=String(identifier||"").trim().toLowerCase();if(!normalized)return null;const users=readStoredJson(userDirectoryStorageKey,[]);return (Array.isArray(users)?users:[]).find(user=>String(user?.contact||"").trim().toLowerCase()===normalized)||null}
function requireLogin(action){if(appState.loggedIn){if(enforceCurrentUserRestriction())return false;return true}openModal("authModal");$("#authMessage").textContent=`登录后才可以${action}。`;$("#authMessage").className="form-message";return false}
function mentorAccountForUsername(username){return mentorAccounts[String(username||"").trim()]||null}
function currentMentorAccount(){const session=appState.mentorAccount,account=mentorAccountForUsername(session?.username);if(account&&account.id===session?.id)return account;if(session?.cloud&&session.id&&session.username)return session;return null}
function hydrateMentorSession(){try{const stored=JSON.parse(sessionStorage.getItem(mentorSessionStorageKey)||"null"),account=mentorAccountForUsername(stored?.username);if(account&&account.id===stored?.id){appState.mentorAccount={id:account.id,username:account.username};return}if(stored?.cloud&&stored.id&&stored.username){appState.mentorAccount={id:String(stored.id),username:String(stored.username),cloud:true};return}sessionStorage.removeItem(mentorSessionStorageKey)}catch{try{sessionStorage.removeItem(mentorSessionStorageKey)}catch{}}appState.mentorAccount=null}
function persistMentorSession(account){appState.mentorAccount={id:account.id,username:account.username,cloud:Boolean(account.cloud),userId:account.userId||account.user?.id||""};try{sessionStorage.setItem(mentorSessionStorageKey,JSON.stringify(appState.mentorAccount))}catch{}}
async function sha256Text(value){if(!globalThis.crypto?.subtle)throw new Error("secure_hash_unavailable");const bytes=new TextEncoder().encode(value),digest=await globalThis.crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("")}
function sameDigest(left,right){if(left.length!==right.length)return false;let difference=0;for(let index=0;index<left.length;index+=1)difference|=left.charCodeAt(index)^right.charCodeAt(index);return difference===0}
async function authenticateMentor(username,password){
  try{
    const cloudResult=await platformCloudReady;
    if(cloudResult?.mode==="v2"&&typeof platformCloud?.signInMentor==="function"){
      try{return await platformCloud.signInMentor({username,password})}
      catch(error){if(error?.code==="mentor_access_required"||error?.code==="invalid_credentials")return null;console.warn("CampusLoop mentor cloud sign-in failed",error);return null}
    }
  }catch(error){
    console.warn("CampusLoop mentor cloud sign-in unavailable",error);
  }
  const account=mentorAccountForUsername(username);if(!account){await sha256Text(`unknown:${password}`);return null}const digest=await sha256Text(`${account.salt}:${password}`);return sameDigest(digest,account.passwordHash)?account:null
}
function setMentorAuthMessage(message,type=""){const element=$("#mentorAuthMessage");if(!element)return;element.textContent=message;element.className=`form-message${type?` ${type}`:""}`}
function applyTutorMode(mode){const nextMode=mode==="mentor"&&currentMentorAccount()?"mentor":"student";appState.tutorMode=nextMode;$$('[data-tutor-mode]').forEach(tab=>{const active=tab.dataset.tutorMode===nextMode;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active))});$("#studentTutorPanel").hidden=nextMode!=="student";$("#mentorTutorPanel").hidden=nextMode!=="mentor";if(nextMode==="mentor")renderMentorRequests()}
function renderMentorAccount(){const account=currentMentorAccount(),name=$("#mentorAccountName"),avatar=$("#mentorAccountAvatar"),logout=$("#mentorLogoutButton");if(name)name.textContent=account?.username||"未登录";if(avatar)avatar.textContent=account?.username.slice(0,1).toUpperCase()||"L";if(logout)logout.disabled=!account}
function openMentorAuth(action=""){applyTutorMode("student");const form=$("#mentorAuthForm");form?.reset();setMentorAuthMessage(action?`请先登录辅导员账号，再${action}。`:"");openModal("mentorAuthModal")}
function requireMentorSession(action){const account=currentMentorAccount();if(account)return account;const quoteModal=$("#quoteModal");if(quoteModal&&!quoteModal.hidden)closeModal("quoteModal");openMentorAuth(action);return null}
async function logoutMentor(){const quoteModal=$("#quoteModal");if(quoteModal&&!quoteModal.hidden)closeModal("quoteModal");$("#quoteForm")?.reset();if(appState.mentorAccount?.cloud&&typeof platformCloud?.signOut==="function")await platformCloud.signOut().catch(error=>console.warn("CampusLoop mentor cloud sign-out failed",error));try{sessionStorage.removeItem(mentorSessionStorageKey)}catch{}appState.mentorAccount=null;applyTutorMode("student");renderMentorRequests();renderMentorAccount();showToast("已退出辅导员账号","log-out")}
function getPublishedItemReviews(){const reviews=readStoredJson(publishedItemReviewStorageKey,{});return reviews&&typeof reviews==="object"&&!Array.isArray(reviews)?reviews:{}}
function publishedItemReview(item){return item?.reviewRequired?getPublishedItemReviews()[String(item.id)]||{}:{status:"approved"}}
function publishedItemStatus(item){return publishedItemReview(item).status||item.reviewStatus||"pending"}
function canViewMarketItem(item){const status=publishedItemStatus(item);return status==="approved"||(item.reviewRequired&&appState.loggedIn&&item.seller===appState.userName)}
function normalizeCountryCode(code,fallback="MY"){const normalized=String(code||"").trim().toUpperCase();return normalized==="UK"?"GB":normalized||fallback}
function marketItemCountry(item){const address=item?.addressId?getAddresses().find(entry=>String(entry.id)===String(item.addressId)):null;const candidate=String(item?.countryCode||item?.country||"").trim().toUpperCase();if(/^[A-Z]{2}$/.test(candidate))return normalizeCountryCode(candidate,"");const countryName=String(item?.countryName||item?.country||"").trim();const entry=countryEntries.find(row=>row.zh===countryName||row.en.toLowerCase()===countryName.toLowerCase());return entry?.code||normalizeCountryCode(address?.country||"","")}
function marketItemCurrency(item){return commerce.currencyForCountry(marketItemCountry(item))}
function marketItemPrice(item,options={}){return commerce.formatMoney(item?.price,marketItemCurrency(item),options)}
function normalizeCityName(city){return String(city||"").normalize("NFKC").trim().toLocaleLowerCase("en")}
function hasBrowseLocation(){return Boolean(appState.location.country&&appState.location.city)}
function localMarketItems(source){if(!hasBrowseLocation())return [];const country=accountMarketCountry(),city=normalizeCityName(appState.location.city);return source.filter(item=>marketItemCountry(item)===country&&normalizeCityName(item.city)===city)}
function itemCard(item){const status=publishedItemStatus(item),reviewLabel=status==="pending"?"审核中":status==="rejected"?"未通过":"",reviewBadge=reviewLabel?`<span class="item-review-badge ${status}"><i data-lucide="${status==="pending"?"clock-3":"circle-alert"}"></i>${reviewLabel}</span>`:"";return `<article class="item-card ${reviewLabel?`review-${status}`:""}" data-item-id="${safeText(item.id)}"><div class="item-photo"><img src="${item.image}" alt="${safeText(item.title)}" loading="lazy"><i data-lucide="${item.icon}"></i><span class="category-chip">${safeText(item.category)}</span>${reviewBadge}<button class="favorite-button" type="button" data-favorite="${safeText(item.id)}" title="收藏"><i data-lucide="heart"></i></button></div><div class="item-body"><div class="item-title-row"><h3>${safeText(item.title)}</h3><span class="item-price">${safeText(marketItemPrice(item))}</span></div><p class="item-description">${safeText(item.description)}</p><div class="item-meta"><i data-lucide="map-pin"></i>${safeText(item.city)}<span>·</span>${safeText(item.age)}</div><div class="item-footer"><span class="seller-line"><span class="avatar avatar-${item.tone}">${safeText(item.avatar)}</span><span>${safeText(item.seller)} · 已实名</span></span></div></div></article>`}
function syncProductImages(item){const label=`${item.title} 商品图片`,image=$("#productImage"),lightboxImage=$("#productLightboxImage"),trigger=$("#productImageTrigger");trigger.classList.remove("is-unavailable");$("#productLightboxMedia").classList.remove("is-unavailable");image.src=item.image;image.alt=label;lightboxImage.src=item.image;lightboxImage.alt=label;$("#productImageCaption").textContent=item.title;trigger.setAttribute("aria-label",`放大查看${item.title}的商品图片`);trigger.title=`放大查看${item.title}的商品图片`}
function showProduct(itemId){const item=items.find(entry=>String(entry.id)===String(itemId));if(!item)return;syncProductImages(item);$("#productCategory").textContent=item.category;$("#productTitle").textContent=item.title;$("#productPrice").textContent=marketItemPrice(item);$("#productDescription").textContent=item.description;$("#productLocation").textContent=`${item.city} · ${commerce.countryName(marketItemCountry(item))}`;$("#productAge").textContent=item.age;$("#productSellerAvatar").textContent=item.avatar;$("#productSellerAvatar").className=`avatar avatar-${item.tone}`;$("#productSeller").textContent=`${item.seller} · 已实名`;let reviewStatus=$("#productReviewStatus");if(!reviewStatus){reviewStatus=document.createElement("div");reviewStatus.id="productReviewStatus";$(".product-actions").before(reviewStatus)}const status=publishedItemStatus(item),review=publishedItemReview(item),orderButton=$("#productOrderButton");if(item.reviewRequired&&status!=="approved"){reviewStatus.hidden=false;reviewStatus.className=`product-review-status ${status}`;reviewStatus.innerHTML=status==="pending"?'<i data-lucide="clock-3"></i><span><strong>商品正在审核</strong><small>管理员通过后，买家才可以创建交易订单。</small></span>':`<i data-lucide="circle-alert"></i><span><strong>商品未通过审核</strong><small>${safeText(review.reason||"请修改商品信息后重新发布。")}</small></span>`;orderButton.disabled=true}else{reviewStatus.hidden=true;reviewStatus.className="product-review-status";reviewStatus.replaceChildren();orderButton.disabled=false}goToView("product");history.replaceState(null,"",`#market/item/${item.id}`);renderIcons()}
function filteredItems(){const query=$("#marketSearch")?.value.trim().toLowerCase()||"",min=Number($("#minPrice")?.value||0),max=Number($("#maxPrice")?.value||Infinity),sort=$("#marketSort")?.value||"newest";const matchesFilters=items.filter(item=>{const category=appState.category==="all"||item.category===appState.category;const matches=!query||`${item.title} ${item.description} ${item.city}`.toLowerCase().includes(query);return canViewMarketItem(item)&&category&&matches&&item.price>=min&&item.price<=max});return localMarketItems(matchesFilters).sort((a,b)=>sort==="priceAsc"?a.price-b.price:sort==="priceDesc"?b.price-a.price:Number(b.id)-Number(a.id))}
function renderMarket(){const selected=hasBrowseLocation(),result=filteredItems(),homeItems=localMarketItems(items.filter(canViewMarketItem)).slice(0,4),area=selected?`${appState.location.city} · ${commerce.countryName(appState.location.country)}`:"地址未选择",locationEmpty=`<div class="empty-state location-empty"><i data-lucide="map-pin-off"></i><strong>地址未选择</strong><span>${appState.loggedIn?"选择浏览地区后，将只展示当地城市的商品。":"登录后会自动使用账户默认地址展示附近商品。"}</span><button class="secondary-button small" data-open-location type="button">${appState.loggedIn?"选择浏览地区":"登录后查看"}</button></div>`;$("#marketCount").textContent=`${area} · ${result.length} 件商品`;$("#itemGrid").innerHTML=!selected?locationEmpty:result.length?result.map(item=>itemCard(item)).join(""):`<div class="empty-state"><strong>${safeText(area)}暂时没有商品</strong><span>可以切换城市，或稍后再回来看看。</span></div>`;$("#homeItemGrid").innerHTML=!selected?locationEmpty:homeItems.length?homeItems.map(item=>itemCard(item)).join(""):`<div class="empty-state"><strong>当前城市暂时没有商品</strong><span>切换城市后会展示当地发布的商品。</span></div>`;renderIcons()}
function readStoredJson(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function safeText(value){return String(value??"").replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character])}
function hydratePublishedItems(){const published=readStoredJson(publishedItemStorageKey,[]);if(!Array.isArray(published))return;published.slice().reverse().forEach(item=>{if(!item?.id)return;const country=marketItemCountry(item),currencyCode=commerce.currencyForCountry(country),hydrated={reviewRequired:true,reviewStatus:item.reviewStatus||"pending",...item,country,currencyCode,currency:commerce.currencySymbol(currencyCode)},existing=items.find(entry=>String(entry.id)===String(item.id));if(existing)Object.assign(existing,hydrated);else items.unshift(hydrated)})}
function currencyForCountry(code){return code?commerce.currencyForCountry(normalizeCountryCode(code)):""}
function accountMarketCountry(){return appState.location.country?normalizeCountryCode(appState.location.country,""):""}
function accountMarketCurrency(){return currencyForCountry(accountMarketCountry())}
function marketPostAddresses(){return appState.loggedIn?getAddresses():[]}
function selectedPostAddress(){return marketPostAddresses().find(entry=>String(entry.id)===String($("#postAddress")?.value))||null}
function applyMarketCurrencyUi(){const currencyCode=accountMarketCurrency(),symbol=currencyCode?commerce.currencySymbol(currencyCode):"",label=$("#marketPriceRangeLabel"),min=$("#minPrice"),max=$("#maxPrice");if(label)label.textContent=currencyCode?`价格范围（${currencyCode} · ${symbol}）`:"价格范围（选择地区后显示）";if(min){min.disabled=!currencyCode;min.placeholder=currencyCode?`最低 ${symbol}`:"最低"}if(max){max.disabled=!currencyCode;max.placeholder=currencyCode?`最高 ${symbol}`:"最高"}}
function normalizeMarketPostControls(){$$('input[name="delivery"]').forEach(input=>{input.style.width="1px";input.style.height="1px"})}
function setupMarketPost(){const marketView=$("#marketView");if(!marketView||$("#marketPostView"))return;marketView.insertAdjacentHTML("afterend",`<section class="view-panel" id="marketPostView" data-view-panel="marketPost"><button class="back-button" type="button" data-view-target="market"><i data-lucide="arrow-left"></i>返回二手市场</button><div class="page-heading post-page-heading"><div><p class="section-kicker">SELL AN ITEM</p><h1>发布二手商品</h1><p>填写商品信息并预览发布效果。</p></div><span class="post-draft-status"><i data-lucide="cloud"></i>本地草稿</span></div><div class="market-post-layout"><form class="market-post-form" id="marketPostForm"><section class="post-form-section"><div class="post-section-heading"><span>01</span><div><h2>商品图片</h2><p>最多 6 张，第一张作为封面。</p></div></div><label class="product-image-upload"><input id="postImages" type="file" accept="image/jpeg,image/png,image/webp" multiple><i data-lucide="image-plus"></i><span><strong>选择商品图片</strong><small>JPG、PNG 或 WebP，单张不超过 8MB</small></span></label><div class="post-image-grid" id="postImageGrid"></div></section><section class="post-form-section"><div class="post-section-heading"><span>02</span><div><h2>基本信息</h2><p>准确的信息更容易获得合适的订单。</p></div></div><div class="post-form-grid"><label class="wide-field">商品标题<div class="field-with-count"><input id="postTitle" name="title" required maxlength="60" placeholder="品牌、品类和主要特点"><small><b id="postTitleCount">0</b>/60</small></div></label><label>商品分类<select id="postCategory" name="category" required><option value="">请选择分类</option><option>教材书籍</option><option>家具家居</option><option>数码电器</option><option>生活用品</option><option>服饰鞋包</option><option>运动户外</option><option>美妆个护</option><option>票券闲置</option><option>其他</option></select></label><label>商品成色<select id="postCondition" name="condition" required><option value="">请选择成色</option><option>全新未使用</option><option>几乎全新</option><option>使用良好</option><option>有明显使用痕迹</option></select></label><label>售价<div class="price-input-group"><select id="postCurrency" aria-label="币种由商品地址决定" disabled><option value="MYR">MYR · RM</option></select><input id="postPrice" name="price" type="number" min="0" step="0.01" required placeholder="0.00"></div></label><label>数量<input name="quantity" type="number" min="1" max="99" value="1" required></label><label class="wide-field">商品描述<textarea id="postDescription" name="description" rows="6" maxlength="600" required placeholder="描述购买时间、使用情况、瑕疵和随附物品"></textarea></label></div></section><section class="post-form-section"><div class="post-section-heading"><span>03</span><div><h2>交易信息</h2><p>地址直接读取设置中的地址簿，币种会按所在国家自动锁定。</p></div></div><div class="post-address-row"><label>商品所在地址<select id="postAddress" name="address" required></select></label><button class="secondary-button small" id="addPostAddress" type="button"><i data-lucide="plus"></i>新增地址</button></div><div class="post-address-summary" id="postAddressSummary"></div><fieldset class="delivery-fieldset"><legend>交付方式</legend><div class="delivery-options"><label><input name="delivery" type="checkbox" value="当面交收" checked><span><i data-lucide="handshake"></i>当面交收</span></label><label><input name="delivery" type="checkbox" value="买家自取"><span><i data-lucide="map-pin-check"></i>买家自取</span></label><label><input name="delivery" type="checkbox" value="邮寄"><span><i data-lucide="package-check"></i>支持邮寄</span></label></div></fieldset></section><div class="post-submit-bar"><span><i data-lucide="shield-check"></i>发布后将进入平台商品审核</span><button class="primary-button" type="submit">确认发布<i data-lucide="arrow-up-right"></i></button></div></form><aside class="post-preview-column"><article class="post-preview-card"><div class="post-preview-media" id="postPreviewMedia"><i data-lucide="image"></i><span>商品封面</span></div><div class="post-preview-body"><span class="category-chip" id="postPreviewCategory">商品分类</span><h3 id="postPreviewTitle">商品标题将显示在这里</h3><strong id="postPreviewPrice">RM 0.00</strong><p id="postPreviewDescription">补充商品描述后，买家可以在这里快速了解商品。</p><small id="postPreviewLocation"><i data-lucide="map-pin"></i>Kuala Lumpur</small></div></article><div class="post-checklist"><strong>发布检查</strong><span><i data-lucide="check-circle-2"></i>图片清晰且为实物拍摄</span><span><i data-lucide="check-circle-2"></i>价格与商品情况一致</span><span><i data-lucide="check-circle-2"></i>描述已注明明显瑕疵</span></div></aside></div></section>`);populatePostAddresses();updatePostPreview();renderIcons()}
function populatePostAddresses(selected=""){const select=$("#postAddress");if(!select)return;const addresses=marketPostAddresses(),candidate=selected||select.value,current=addresses.some(address=>String(address.id)===String(candidate))?candidate:"",preferred=current||addresses.find(address=>address.isDefault)?.id||addresses[0]?.id||"";select.replaceChildren(new Option(addresses.length?"请选择账户地址":appState.loggedIn?"请先在设置中添加地址":"登录后读取账户地址",""));addresses.forEach(address=>select.append(new Option(`${address.label} · ${address.name} · ${address.city} · ${addressCountryName(address.country)}`,address.id)));if(preferred&&[...select.options].some(option=>option.value===String(preferred)))select.value=String(preferred);updatePostAddressSummary()}
function updatePostAddressSummary(){const address=selectedPostAddress(),summary=$("#postAddressSummary"),currencySelect=$("#postCurrency"),currencyCode=address?currencyForCountry(address.country):"",currencyLabel=currencyCode?`${currencyCode} · ${commerce.currencySymbol(currencyCode)}`:"未选择";if(!summary)return;if(currencySelect){currencySelect.setAttribute("aria-label","币种由商品所在地址决定");currencySelect.replaceChildren(new Option(currencyLabel,currencyCode))}if(!address)summary.innerHTML=`<i data-lucide="map-pinned"></i><span><strong>${appState.loggedIn?"请选择商品所在地址":"登录后读取账户地址"}</strong><small>商品币种由实际发布地址决定，不跟随当前浏览地区。</small></span>`;else summary.innerHTML=`<i data-lucide="map-pinned"></i><span><strong>${safeText(address.name)} · ${safeText(address.city)}</strong><small>${safeText(address.detail)}${address.postalCode?` · ${safeText(address.postalCode)}`:""} · ${safeText(addressCountryName(address.country))} · 价格固定使用 ${safeText(currencyLabel)}</small></span>`;updatePostPreview();renderIcons()}
function updatePostPreview(){if(!$("#postPreviewTitle"))return;const title=$("#postTitle")?.value.trim()||"商品标题将显示在这里",description=$("#postDescription")?.value.trim()||"补充商品描述后，买家可以在这里快速了解商品。",category=$("#postCategory")?.value||"商品分类",address=selectedPostAddress(),currencyCode=address?currencyForCountry(address.country):"",price=Number($("#postPrice")?.value||0);$("#postPreviewTitle").textContent=title;$("#postPreviewDescription").textContent=description;$("#postPreviewCategory").textContent=category;$("#postPreviewPrice").textContent=currencyCode?commerce.formatMoney(price,currencyCode,{minimumFractionDigits:2}):"—";$("#postPreviewLocation").innerHTML=`<i data-lucide="map-pin"></i>${address?`${safeText(address.city)} · ${safeText(addressCountryName(address.country))}`:"地址未选择"}`;$("#postTitleCount").textContent=$("#postTitle")?.value.length||0;const media=$("#postPreviewMedia");media.innerHTML=postImages.length?`<img src="${postImages[0]}" alt="商品封面预览">`:'<i data-lucide="image"></i><span>商品封面</span>';renderIcons()}
function renderPostImages(){const grid=$("#postImageGrid");if(!grid)return;grid.innerHTML=postImages.map((image,index)=>`<div class="post-image-thumb"><img src="${image}" alt="商品图片 ${index+1}">${index===0?'<span>封面</span>':""}<button type="button" data-remove-post-image="${index}" title="移除图片"><i data-lucide="x"></i></button></div>`).join("");updatePostPreview();renderIcons()}
function compressProductImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error("read"));reader.onload=()=>{const image=new Image();image.onerror=()=>reject(new Error("image"));image.onload=()=>{const max=1200,scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement("canvas");canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.82))};image.src=reader.result};reader.readAsDataURL(file)})}
function persistPublishedItem(item){const stored=readStoredJson(publishedItemStorageKey,[]),updated=[item,...(Array.isArray(stored)?stored.filter(entry=>String(entry.id)!==String(item.id)):[])].slice(0,30);try{localStorage.setItem(publishedItemStorageKey,JSON.stringify(updated))}catch{localStorage.setItem(publishedItemStorageKey,JSON.stringify(updated.map(entry=>({...entry,image:String(entry.image).startsWith("data:")?postFallbackImage:entry.image}))))}}
function bindPublishedItemSync(){window.addEventListener("storage",event=>{if(event.key!==publishedItemStorageKey&&event.key!==publishedItemReviewStorageKey)return;hydratePublishedItems();renderMarket();const productMatch=location.hash.slice(1).match(/^market\/item\/([^/]+)$/);if(productMatch)showProduct(productMatch[1])})}
function resetMarketPostForm(form,addressId=""){form.reset();postImages=[];postImageFiles=[];populatePostAddresses(addressId);renderPostImages()}
function marketCloudErrorMessage(error){const messages={auth_required:"请先登录云端账号后再发布商品",cloud_schema_unavailable:"云端数据库尚未完成部署，当前只能保存本地草稿",v2_listing_requires_address_and_scanned_image:"云端发布需要至少一张商品图片和一个有效地址",invalid_market_image:"商品图片未通过安全校验",invalid_image_count:"请添加 1–6 张商品图片",invalid_price:"请输入有效售价",invalid_title:"商品标题长度不正确",invalid_description:"请补充商品描述",address_not_found:"商品地址已失效，请重新选择"};return messages[error?.code]||"商品暂时无法发布，请稍后重试"}
function bindMarketPost(){const form=$("#marketPostForm");if(!form)return;[$("#postTitle"),$("#postCategory"),$("#postDescription"),$("#postPrice")].forEach(input=>input.addEventListener("input",updatePostPreview));$("#postAddress").addEventListener("change",updatePostAddressSummary);$("#addPostAddress").addEventListener("click",()=>openAddressEditor());$("#postImages").addEventListener("change",async event=>{const files=[...event.target.files],available=Math.max(0,6-postImages.length);if(files.length>available)showToast("最多添加 6 张图片","images");for(const file of files.slice(0,available)){if(file.size>8*1024*1024){showToast(`${file.name} 超过 8MB，未添加`,`circle-alert`);continue}try{postImages.push(await compressProductImage(file));postImageFiles.push(file)}catch{showToast(`${file.name} 无法读取`,`circle-alert`)}}event.target.value="";renderPostImages()});$("#postImageGrid").addEventListener("click",event=>{const remove=event.target.closest("[data-remove-post-image]");if(!remove)return;const index=Number(remove.dataset.removePostImage);postImages.splice(index,1);postImageFiles.splice(index,1);renderPostImages()});form.addEventListener("submit",async event=>{event.preventDefault();if(marketPostSubmitting)return;if(!requireLogin("发布商品"))return;const data=new FormData(form),address=getAddresses().find(entry=>entry.id===data.get("address")),deliveries=data.getAll("delivery");if(!address){showToast("请先选择商品所在地址","map-pin");return}if(!deliveries.length){showToast("请至少选择一种交付方式","package");return}marketPostSubmitting=true;const submitButton=form.querySelector("[type=submit]");if(submitButton){submitButton.disabled=true;submitButton.innerHTML='<i data-lucide="loader-circle"></i>正在准备…';renderIcons()}const category=String(data.get("category")),currencyCode=currencyForCountry(address.country),icons={教材书籍:"book-open",家具家居:"armchair",数码电器:"laptop",生活用品:"package",服饰鞋包:"shirt",运动户外:"bike",美妆个护:"sparkles",票券闲置:"ticket",其他:"box"},submittedAt=new Date().toISOString(),item={schemaVersion:2,id:Date.now(),title:String(data.get("title")).trim(),category,condition:String(data.get("condition")),price:Number(data.get("price")),currencyCode,currency:commerce.currencySymbol(currencyCode),city:address.city,country:address.country,addressId:address.id,delivery:deliveries,deliveryMethods:deliveries,quantity:Number(data.get("quantity")),seller:appState.userName,sellerName:appState.userName,sellerId:appState.userId||accountUserId(),avatar:appState.userName.slice(0,1).toUpperCase(),tone:"coral",icon:icons[category]||"box",image:postImages[0]||postFallbackImage,description:String(data.get("description")).trim(),age:"刚刚",submittedAt,reviewRequired:true,reviewStatus:"pending"};
    let cloudResult=null;
    try{cloudResult=await platformCloudReady}catch(error){console.warn("CampusLoop platform cloud readiness failed",error)}
    if(cloudResult?.mode==="v2"&&platformCloud?.uploadFile&&cloudAuth?.createItem){
      if(!postImageFiles.length){showToast("云端发布至少需要一张商品图片","image-plus");marketPostSubmitting=false;if(submitButton){submitButton.disabled=false;submitButton.innerHTML='确认发布<i data-lucide="arrow-up-right"></i>';renderIcons()}return}
      if(submitButton){submitButton.innerHTML='<i data-lucide="loader-circle"></i>正在上传并提交…';renderIcons()}
      try{
        const imageFileIds=[];
        for(const file of postImageFiles){const uploaded=await platformCloud.uploadFile({file,category:"market_image"});if(uploaded?.fileId)imageFileIds.push(uploaded.fileId)}
        if(imageFileIds.length!==postImageFiles.length)throw Object.assign(new Error("invalid_market_image"),{code:"invalid_market_image"});
        const previewImage=item.image;
        const saved=await cloudAuth.createItem({...item,imageFileIds});
        Object.assign(item,saved,{cloud:true,id:saved.id,reviewStatus:"pending",seller:appState.userName,sellerName:appState.userName,sellerId:appState.userId||accountUserId(),country:address.country,countryCode:address.country,city:address.city,addressId:address.id,image:postImages[0]||postFallbackImage});
        // The v2 feed intentionally omits private media URLs. Keep the local
        // preview for the just-created card until a signed media URL is
        // available, and preserve the address snapshot used for filtering.
        item.image=saved?.image||previewImage;
        item.seller=saved?.sellerName||item.seller;
        item.country=address.country;
        item.countryCode=address.country;
        item.city=address.city;
        item.addressId=address.id;
        item.delivery=deliveries;
        item.deliveryMethods=deliveries;
        items.unshift(item);persistPublishedItem(item);renderMarket();showToast("商品已提交，管理员端已收到审核申请","clock-3");resetMarketPostForm(form);showProduct(item.id);return;
      }catch(error){console.error("CampusLoop market cloud submission failed",error);showToast(marketCloudErrorMessage(error),"cloud-off");return}
      finally{marketPostSubmitting=false;if(submitButton){submitButton.disabled=false;submitButton.innerHTML='确认发布<i data-lucide="arrow-up-right"></i>';renderIcons()}}
    }
    // Local mode remains available until a staging v2 schema is configured.
    items.unshift(item);persistPublishedItem(item);renderMarket();showToast("商品已保存为本地待审核草稿","clock-3");resetMarketPostForm(form);showProduct(item.id);marketPostSubmitting=false;if(submitButton){submitButton.disabled=false;submitButton.innerHTML='确认发布<i data-lucide="arrow-up-right"></i>';renderIcons()}
  })}
function setupAcademicFields(){const majorInput=$('#requestForm [name="major"]'),budgetInput=$('#requestForm [name="budget"]'),cityInput=$('#requestForm [name="city"]');if(!majorInput)return;const categoryLabel=document.createElement("label"),majorLabel=majorInput.closest("label");categoryLabel.innerHTML='专业分类<select id="majorCategory" required></select>';majorLabel.textContent="具体专业";const majorSelect=document.createElement("select");majorSelect.id="majorSelect";majorSelect.name="major";majorSelect.required=true;majorLabel.append(majorSelect);majorLabel.before(categoryLabel);budgetInput?.closest("label")?.remove();if(cityInput){const locationLabel=cityInput.closest("label");locationLabel.innerHTML='需求所在地址<select id="tutorRequestAddress" name="addressId" required></select><small id="tutorRequestLocationSummary"></small>';$("#tutorRequestAddress").addEventListener("change",updateTutorRequestLocationSummary)}const categorySelect=$("#majorCategory");fillLocationSelect(categorySelect,Object.keys(majorCatalog),"请选择专业分类","");const populateMajors=()=>fillLocationSelect(majorSelect,majorCatalog[categorySelect.value]||[],"请选择具体专业","");categorySelect.addEventListener("change",populateMajors);populateMajors();populateTutorRequestAddresses()}
function populateTutorRequestAddresses(selected=""){const select=$("#tutorRequestAddress");if(!select)return;const addresses=getAddresses(),current=selected||select.value,preferred=current||addresses.find(address=>address.isDefault)?.id||addresses[0]?.id||"";select.replaceChildren(new Option(addresses.length?"请选择需求所在地址":"请先在设置中新增地址",""));addresses.forEach(address=>select.append(new Option(`${address.label} · ${address.name} · ${address.city} · ${addressCountryName(address.country)}`,address.id)));if(preferred&&[...select.options].some(option=>option.value===preferred))select.value=preferred;updateTutorRequestLocationSummary()}
function updateTutorRequestLocationSummary(){const address=getAddresses().find(entry=>String(entry.id)===String($("#tutorRequestAddress")?.value)),summary=$("#tutorRequestLocationSummary");if(!summary)return;summary.textContent=address?`学生端和辅导员端统一使用 ${currencyForCountry(address.country)} · ${commerce.currencySymbol(currencyForCountry(address.country))}，辅导员仅看到国家和城市。`:"添加地址后，系统会按所在国家锁定报价币种。"}
function normalizeTutorRequest(request,index=0){if(!request)return null;const sourceSnapshot=request.addressSnapshot||{},rawCountryCode=String(sourceSnapshot.countryCode||request.country||"MY").toUpperCase(),countryCode=rawCountryCode==="UK"?"GB":rawCountryCode,city=sourceSnapshot.city||request.city||"Kuala Lumpur",currencyCode=commerce.currencyForCountry(countryCode);return {...request,schemaVersion:2,id:String(request.id||`legacy-${request.subject||"request"}-${index}`),addressSnapshot:{addressId:sourceSnapshot.addressId||request.addressId||"",countryCode,countryName:commerce.countryName(countryCode),city},currencyCode,file:request.file||"未附文件"}}
function hydrateCloudTutoring(data){
  if(!data||!Array.isArray(data.requests))return;
  const typeLabels={essay_structure:"论文结构梳理",assignment_support:"作业辅导",language_polish:"语言润色",course_tutoring:"课程答疑"};
  const requests=data.requests.map((row)=>normalizeTutorRequest({
    schemaVersion:2,
    id:row.id,
    studentId:appState.userId,
    subject:row.subject,
    majorCategory:row.major_category,
    major:row.major,
    type:typeLabels[row.request_type]||row.request_type,
    deadline:row.deadline?new Date(row.deadline).toLocaleDateString("zh-CN",{year:"numeric",month:"numeric",day:"numeric"}):"",
    deadlineIso:row.deadline,
    brief:row.brief_private||row.mentor_summary||"",
    file:"云端附件",
    addressSnapshot:{addressId:row.address_id,countryCode:row.country_code,countryName:commerce.countryName(row.country_code),city:row.city},
    currencyCode:row.currency_code,
    submittedAt:row.submitted_at||row.created_at,
    status:row.status,
    cloud:true,
    version:row.version
  })).filter(Boolean);
  if(requests.length||appState.loggedIn)localStorage.setItem(tutorStorage.requests,JSON.stringify(requests));
  const billingLabels={one_time:"一次性",hourly:"每小时"};
  const quotes=(Array.isArray(data.quotes)?data.quotes:[]).map((row)=>normalizeTutorQuote({
    schemaVersion:2,id:row.id,requestId:row.request_id,mentorId:row.mentor_id,mentorName:"辅导员",
    amount:Number(row.amount_minor)/(10**(new Set(["BIF","CLP","DJF","GNF","ISK","JPY","KMF","KRW","PYG","RWF","UGX","VND","VUV","XAF","XOF"]).has(String(row.currency_code||"").toUpperCase())?0:2)),
    currencyCode:row.currency_code,billing:billingLabels[row.billing_mode]||row.billing_mode,note:row.note,status:row.status,cloud:true
  })).filter(Boolean);
  if(quotes.length||appState.loggedIn)localStorage.setItem(tutorStorage.quotes,JSON.stringify(quotes));
  const selections=Array.isArray(data.selections)?data.selections:[];
  if(selections.length||appState.loggedIn)localStorage.setItem(tutorStorage.selected,JSON.stringify(selections.map(row=>({schemaVersion:2,requestId:row.request_id,quoteId:row.quote_id,status:row.status,selectedAt:row.selected_at,reviewedAt:row.reviewed_at,reason:row.review_reason,cloud:true}))));
}
function storedTutorRequests(){const stored=readStoredJson(tutorStorage.requests,[]),requests=Array.isArray(stored)?stored.map(normalizeTutorRequest).filter(Boolean):[],legacy=normalizeTutorRequest(readStoredJson(tutorStorage.request),requests.length);if(legacy&&!requests.some(request=>request.id===legacy.id))requests.unshift(legacy);return requests}
function allTutorRequests(){const stored=storedTutorRequests(),ids=new Set(stored.map(request=>request.id));return [...stored,...mentorRequests.map(normalizeTutorRequest).filter(request=>!ids.has(request.id))]}
function saveTutorRequest(request){const normalized=normalizeTutorRequest(request),updated=[normalized,...storedTutorRequests().filter(entry=>entry.id!==normalized.id)].slice(0,30);localStorage.setItem(tutorStorage.requests,JSON.stringify(updated));localStorage.setItem(tutorStorage.request,JSON.stringify(normalized))}
function tutorRequestById(id){return allTutorRequests().find(request=>String(request.id)===String(id))}
function normalizeTutorQuote(quote){if(!quote||typeof quote!=="object")return null;const request=tutorRequestById(quote.requestId)||allTutorRequests().find(entry=>entry.subject===quote.subject),requestId=String(quote.requestId||request?.id||""),currencyCode=commerce.normalizeCurrency(quote.currencyCode||quote.currency,request?.addressSnapshot.countryCode);return {...quote,schemaVersion:2,id:String(quote.id||""),requestId,subject:String(quote.subject||request?.subject||""),mentorName:String(quote.mentorName||"Yuki"),currencyCode,currency:currencyCode,amount:Number(quote.amount),billing:String(quote.billing||"一次性"),note:String(quote.note||"")}}
function storedTutorQuotes(){const plural=readStoredJson(tutorStorage.quotes,[]),legacy=readStoredJson(tutorStorage.quote),values=[...(Array.isArray(plural)?plural:[]),...(legacy?[legacy]:[])],quotes=new Map();values.map(normalizeTutorQuote).filter(Boolean).forEach(quote=>{const key=quote.id||quote.requestId;if(!quotes.has(key))quotes.set(key,quote)});return [...quotes.values()]}
function tutorQuoteForRequest(requestId,mentorId=""){return storedTutorQuotes().find(quote=>String(quote.requestId)===String(requestId)&&(!mentorId||String(quote.mentorId||"")===String(mentorId)))||null}
function readTutorQuote(requestId=""){return requestId?tutorQuoteForRequest(requestId):storedTutorQuotes()[0]||null}
function saveTutorQuote(quote){const normalized=normalizeTutorQuote(quote),updated=[normalized,...storedTutorQuotes().filter(entry=>entry.id!==normalized.id&&!(entry.requestId===normalized.requestId&&String(entry.mentorId||"")===String(normalized.mentorId||"")))].slice(0,30);localStorage.setItem(tutorStorage.quotes,JSON.stringify(updated));localStorage.setItem(tutorStorage.quote,JSON.stringify(normalized));return normalized}
function activeStudentRequest(){const stored=storedTutorRequests();if(stored.length)return stored[0];const quote=readTutorQuote();return tutorRequestById(quote?.requestId)||allTutorRequests().find(request=>request.subject===quote?.subject)||null}
function quoteMatchesRequest(quote,request){return Boolean(quote&&request&&(String(quote.requestId)===String(request.id)||(!quote.requestId&&quote.subject===request.subject)))}
function quoteCurrencyMatchesRequest(quote,request){return Boolean(quote&&request&&commerce.normalizeCurrency(quote.currencyCode||quote.currency)===request.currencyCode)}
function tutorStateList(key){const value=readStoredJson(key);return (Array.isArray(value)?value:value&&typeof value==="object"?[value]:[]).filter(entry=>entry&&typeof entry==="object")}
function tutorStateForQuote(key,quote){if(!quote)return null;return tutorStateList(key).find(state=>String(state.requestId||"")===String(quote.requestId)&&String(state.quoteId||"")===String(quote.id)&&commerce.normalizeCurrency(state.currencyCode)===quote.currencyCode)||null}
function tutorStateMatches(key,quote,request){const state=tutorStateForQuote(key,quote);return Boolean(state&&(!state.quoteFingerprint||state.quoteFingerprint===tutorQuoteFingerprint(quote,request)))}
function saveTutorState(key,state){const requestId=String(state?.requestId||""),updated=[state,...tutorStateList(key).filter(entry=>String(entry.requestId||"")!==requestId)];localStorage.setItem(key,JSON.stringify(updated));return state}
function removeTutorState(key,requestId){const current=tutorStateList(key),updated=current.filter(entry=>String(entry.requestId||"")!==String(requestId||""));if(updated.length)localStorage.setItem(key,JSON.stringify(updated));else localStorage.removeItem(key)}
function tutorReviewState(quote,request){if(!quote||!request)return {review:null,hasCanonical:false};const fingerprint=tutorQuoteFingerprint(quote,request),reviews=readStoredJson(tutorStorage.matchReviews,{}),canonical=reviews&&typeof reviews==="object"&&!Array.isArray(reviews)?reviews[String(request.id)]:null;if(canonical&&typeof canonical==="object"){const matches=String(canonical.requestId||request.id)===String(request.id)&&String(canonical.quoteId||"")===String(quote.id)&&commerce.normalizeCurrency(canonical.currencyCode)===request.currencyCode&&canonical.quoteFingerprint===fingerprint;return {review:matches?canonical:null,hasCanonical:true}}const legacy=tutorStateForQuote(tutorStorage.review,quote);return {review:legacy&&(!legacy.quoteFingerprint||legacy.quoteFingerprint===fingerprint)?legacy:null,hasCanonical:false}}
function removeTutorMatchReview(requestId){const reviews=readStoredJson(tutorStorage.matchReviews,{});if(reviews&&typeof reviews==="object"&&!Array.isArray(reviews)&&Object.hasOwn(reviews,String(requestId))){const updated={...reviews};delete updated[String(requestId)];if(Object.keys(updated).length)localStorage.setItem(tutorStorage.matchReviews,JSON.stringify(updated));else localStorage.removeItem(tutorStorage.matchReviews)}removeTutorState(tutorStorage.review,requestId)}
function ensureQuoteModal(){if($("#quoteModal"))return;document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop" id="quoteModal" hidden><section class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="quoteTitle"><button class="modal-close" data-close-modal="quoteModal" type="button" aria-label="关闭"><i data-lucide="x"></i></button><p class="section-kicker">MENTOR QUOTE</p><h2 id="quoteTitle">提交辅导报价</h2><p class="modal-copy" id="quoteRequestName">报价只会在学生选择后交由管理员确认。</p><form id="quoteForm"><input type="hidden" name="requestId"><input type="hidden" name="subject"><input type="hidden" name="currencyCode"><div class="quote-form-grid"><label>学生所在地区<input id="quoteRequestLocation" readonly></label><label>锁定币种<input id="quoteCurrencyDisplay" readonly></label></div><label>报价金额<input name="amount" type="number" min="1" step="1" required placeholder="例如：120"></label><label>计价方式<select name="billing" required><option value="一次性">一次性总价</option><option value="每小时">每小时</option></select></label><label>报价说明<textarea name="note" rows="3" maxlength="180" placeholder="说明包含的辅导内容、预计时长和交付方式"></textarea></label><p class="form-message">币种由学生提交需求时的国家锁定。管理员确认前不会开启私信。</p><button class="primary-button full-button" type="submit">提交报价<i data-lucide="send"></i></button></form></section></div>`);renderIcons()}
function quotePrice(quote){return `${commerce.formatMoney(quote.amount,quote.currencyCode||quote.currency)} / ${quote.billing}`}
function tutorConnectionState(){return cloudAuthMode==="v2"&&platformCloudMode==="v2"?{className:"connected",icon:"radio",label:"实时连接正常"}:{className:"local",icon:"hard-drive",label:"仅本机演示 · 不跨设备同步"}}
function tutorQuoteFingerprint(quote,request){return quote&&request?JSON.stringify([quote.id,quote.requestId,request.id,request.addressSnapshot.countryCode,request.addressSnapshot.city,request.currencyCode,quote.currencyCode,Number(quote.amount),quote.billing,quote.note||""]):""}
function normalizeMentorCloudRequest(row,index=0){if(!row)return null;const typeLabels={essay_structure:"论文结构梳理",assignment_support:"作业辅导",language_polish:"语言润色",course_tutoring:"课程答疑"};const countryCode=String(row.country_code||"").toUpperCase();return normalizeTutorRequest({schemaVersion:2,id:String(row.id||`cloud-request-${index}`),subject:row.subject,majorCategory:row.major_category,major:row.major,type:typeLabels[row.request_type]||row.request_type,deadline:row.deadline?new Date(row.deadline).toLocaleDateString("zh-CN",{year:"numeric",month:"numeric",day:"numeric"}):"",brief:row.mentor_summary||"",file:Array.isArray(row.attachment_types)?row.attachment_types.join("、")||"未附文件":"未附文件",addressSnapshot:{countryCode,countryName:commerce.countryName(countryCode),city:row.city},currencyCode:row.currency_code,status:"open_for_quotes",cloud:true})}
function refreshMentorCloudRequests(){if(mentorCloudRequestsPromise)return mentorCloudRequestsPromise;mentorCloudRequestsPromise=platformCloud.listMentorOpenRequests().then(rows=>{mentorCloudRequests=(Array.isArray(rows)?rows:[]).map(normalizeMentorCloudRequest).filter(Boolean);renderMentorRequests();return mentorCloudRequests}).catch(error=>{console.error("CampusLoop mentor request feed failed",error);mentorCloudRequests=[];showToast("辅导需求暂时无法加载，请稍后刷新","cloud-off");return []}).finally(()=>{mentorCloudRequestsPromise=null});return mentorCloudRequestsPromise}
function renderMentorRequests(){const account=currentMentorAccount(),list=$("#mentorRequestList"),total=$(".mentor-stat strong");renderMentorAccount();if(!list)return;if(!account){list.replaceChildren();if(total)total.textContent="00";return}if(account.cloud&&platformCloudMode==="v2"&&!mentorCloudRequests.length&&!mentorCloudRequestsPromise){list.innerHTML='<div class="empty-state"><i data-lucide="loader-circle"></i><strong>正在加载可抢需求</strong><span>仅显示匿名摘要和所在城市。</span></div>';renderIcons();refreshMentorCloudRequests();return}const requests=account.cloud&&platformCloudMode==="v2"?mentorCloudRequests:allTutorRequests();list.innerHTML=requests.map(request=>{const quoted=Boolean(tutorQuoteForRequest(request.id,account.id)),currencyLabel=`${request.currencyCode} · ${commerce.currencySymbol(request.currencyCode)}`,place=`${request.addressSnapshot.countryName} · ${request.addressSnapshot.city}`;return `<article class="request-card"><div class="request-card-top"><div><h3>${safeText(request.subject)}</h3><p>${safeText(request.type)} · 匿名需求</p></div><span class="status-dot ${quoted?"quoted":""}"><i></i>${quoted?"已报价":"等待报价"}</span></div><div class="request-card-meta"><span class="meta-chip"><i data-lucide="calendar-days"></i>${safeText(request.deadline)}</span><span class="meta-chip"><i data-lucide="map-pin"></i>${safeText(place)}</span><span class="meta-chip"><i data-lucide="coins"></i>${safeText(currencyLabel)}</span><span class="meta-chip"><i data-lucide="paperclip"></i>${safeText(request.file)}</span></div><div class="privacy-note"><i data-lucide="shield-check"></i>仅显示学生所在国家和城市，不展示姓名、联系方式、详细地址或原始附件。</div><button class="secondary-button" data-quote-request="${safeText(request.id)}" type="button">${quoted?"修改我的报价":"提交报价"}<i data-lucide="arrow-up-right"></i></button></article>`}).join("")||'<div class="empty-state"><i data-lucide="inbox"></i><strong>暂无开放需求</strong><span>新的需求通过管理员审核后会出现在这里。</span></div>';if(total)total.textContent=String(requests.length).padStart(2,"0");renderIcons()}
let tutorCloudMessagesPromise=null;
async function hydrateTutorCloudMessages(requestId){
  if(platformCloudMode!=="v2"||typeof platformCloud?.listTutoringMessages!=="function")return;
  if(tutorCloudMessagesPromise)return tutorCloudMessagesPromise;
  tutorCloudMessagesPromise=(async()=>{
    try{
      const result=await platformCloud.listTutoringMessages(requestId);
      const rows=Array.isArray(result?.messages)?result.messages:[];
      if(rows.length){
        const messages=rows.map(row=>({side:String(row.senderId||"")===String(appState.userId||"")?"self":"other",text:row.text,time:new Date(row.createdAt).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}));
        localStorage.setItem(tutorStorage.messages,JSON.stringify(messages));
        renderTutorMessages();
      }
      return result;
    }catch(error){console.warn("CampusLoop tutoring messages refresh failed",error);return null}
  })().finally(()=>{tutorCloudMessagesPromise=null});
  return tutorCloudMessagesPromise;
}
function renderTutorMessages(){const list=$("#orderMessageList");if(!list)return;const messages=readStoredJson(tutorStorage.messages,[]),connected=cloudAuthMode==="v2"&&platformCloudMode==="v2";list.innerHTML=messages.length?messages.map(message=>{const original=String(message.time||"");const time=connected?original:original.replace(/已送达/g,"仅本机 · 未同步");return `<div class="order-message ${message.side}"><span>${safeText(message.text)}</span><time>${safeText(time||"仅本机 · 未同步")}</time></div>`}).join(""):'<div class="order-chat-empty">管理员已确认订单，现在可以开始沟通。</div>';const form=$("#orderChatForm"),ready=connected&&typeof platformCloud?.sendTutoringMessage==="function";if(form){const input=form.querySelector("textarea"),button=form.querySelector("button[type='submit']");if(input){input.disabled=!ready;input.placeholder=ready?"输入订单相关消息":"云端消息服务连接后开放"}if(button)button.disabled=!ready}list.scrollTop=list.scrollHeight}
function renderTutorWorkflow(){const container=$("#tutorQuoteStatus");if(!container)return;const request=activeStudentRequest(),quote=request?tutorQuoteForRequest(request.id):null,fingerprint=tutorQuoteFingerprint(quote,request),reviewState=tutorReviewState(quote,request),review=reviewState.review,selected=tutorStateMatches(tutorStorage.selected,quote,request)||Boolean(review),approved=review?.status==="approved"||(!reviewState.hasCanonical&&tutorStateMatches(tutorStorage.approved,quote,request)),rejected=Boolean(quote&&selected&&review?.status==="rejected"&&String(review.requestId||"")===request.id&&review.quoteFingerprint===fingerprint),locationText=request?`${request.addressSnapshot.countryName} · ${request.addressSnapshot.city}`:"",connection=tutorConnectionState();if(!quote){container.innerHTML=`<div class="quote-empty"><i data-lucide="badge-dollar-sign"></i><strong>等待辅导员报价</strong><span>${request?`${safeText(locationText)} · ${safeText(request.currencyCode)} 报价`:"发布需求后，辅导员可以按需求所在地报价。"}</span></div>`}else if(!quoteCurrencyMatchesRequest(quote,request)){container.innerHTML=`<div class="quote-card rejected"><div class="quote-state-icon"><i data-lucide="circle-x"></i></div><div><strong>报价币种与需求地区不一致</strong><p>该需求应使用 ${safeText(request.currencyCode)} · ${safeText(commerce.currencySymbol(request.currencyCode))}，旧报价不会自动换算金额。</p><small>请辅导员重新提交报价。</small></div></div>`}else if(!selected){container.innerHTML=`<div class="quote-card"><div class="quote-card-head"><span class="avatar avatar-mint">Y</span><div><strong>辅导员 ${safeText(quote.mentorName||"Yuki")}</strong><small>${safeText(locationText)} · 已实名</small></div><b>${safeText(quotePrice(quote))}</b></div><p>${safeText(quote.note||"包含需求梳理、在线辅导和一次答疑。")}</p><button class="primary-button full-button" data-accept-quote data-request-id="${safeText(request.id)}" data-quote-id="${safeText(quote.id)}" type="button">接受这份报价<i data-lucide="check"></i></button></div>`}else if(rejected){container.innerHTML=`<div class="quote-card rejected"><div class="quote-state-icon"><i data-lucide="circle-x"></i></div><div><strong>该匹配未通过</strong><p>${safeText(review.reason||"当前报价未通过管理员审核。")}</p><small>辅导员修改并重新提交报价后，你可以再次选择。</small></div></div>`}else if(!approved){container.innerHTML=`<div class="quote-card selected"><div class="quote-state-icon"><i data-lucide="clock-3"></i></div><div><strong>已选择 ${safeText(quotePrice(quote))}</strong><p>${safeText(locationText)} · 报价已提交管理员确认。确认前双方无法私信。</p></div></div>`}else{container.innerHTML=`<div class="quote-card approved"><div class="quote-card-head"><span class="avatar avatar-mint">Y</span><div><strong>辅导员 ${safeText(quote.mentorName||"Yuki")}</strong><small>管理员已确认 · ${safeText(quotePrice(quote))}</small></div><span class="approved-label"><i data-lucide="shield-check"></i>已开启沟通</span></div></div><section class="order-chat"><div class="order-chat-head"><div><strong>订单沟通</strong><small>仅当前订单的学生与辅导员可见</small></div><span class="connection-badge ${connection.className}"><i data-lucide="${connection.icon}"></i>${connection.label}</span></div><div class="order-message-list" id="orderMessageList"></div><form class="order-chat-form" id="orderChatForm"><textarea rows="1" maxlength="500" placeholder="输入订单相关消息" required></textarea><button class="send-button" type="submit" title="发送"><i data-lucide="send"></i></button></form></section>`;renderTutorMessages()}renderIcons()}
function setupTutorWorkflow(){const side=$(".request-side");if(!side||$("#tutorQuoteStatus"))return;const quoteStep=[...side.querySelectorAll(".timeline-step")].find(step=>step.querySelector("strong")?.textContent.includes("抢单"));if(quoteStep){quoteStep.querySelector("strong").textContent="等待辅导员报价";quoteStep.querySelector("small").textContent="收到报价后由你选择"}side.insertAdjacentHTML("beforeend",'<div class="tutor-quote-section"><div class="subsection-heading"><span>辅导员报价</span><small>由你选择，管理员最终确认</small></div><div id="tutorQuoteStatus"></div></div>');ensureQuoteModal();renderTutorWorkflow()}
function identityUserId(){return accountUserId()}
function getIdentityApplications(){const applications=readStoredJson(identityApplicationStorageKey,[]);return Array.isArray(applications)?applications.filter(application=>application&&application.id):[]}
function getIdentityReviews(){const reviews=readStoredJson(identityReviewStorageKey,{});return reviews&&typeof reviews==="object"&&!Array.isArray(reviews)?reviews:{}}
function currentIdentityApplication(){if(!appState.loggedIn)return null;return getIdentityApplications().filter(application=>String(application.userId||"")===identityUserId()).sort((a,b)=>String(b.submittedAt||"").localeCompare(String(a.submittedAt||"")))[0]||null}
function currentIdentityStatus(application=currentIdentityApplication()){if(!application)return {status:"unsubmitted",review:null};const review=getIdentityReviews()[application.id];return {status:review?.status||"pending",review:review||null}}
function formatIdentityFileSize(bytes){const size=Number(bytes)||0;if(size<1024)return `${size} B`;if(size<1024*1024)return `${(size/1024).toFixed(size<10240?1:0)} KB`;return `${(size/1024/1024).toFixed(1)} MB`}
function normalizedIdentityFileType(file){const type=String(file?.type||"").toLowerCase();if(identityAllowedTypes.has(type))return type;if(type&&type!=="application/octet-stream")return "";const extension=String(file?.name||"").split(".").pop().toLowerCase();return ({jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",pdf:"application/pdf"})[extension]||""}
function setIdentityMessage(message,type=""){const element=$("#identityMessage");if(!element)return;element.textContent=message;element.className=`form-message${type?` ${type}`:""}`}
function identityCloudErrorMessage(error){const code=String(error?.code||error?.message||"").toLowerCase();const map={auth_required:"请先登录后再提交实名认证",identity_application_pending:"已有一份实名认证申请正在审核",identity_document_required:"请先选择证件文件",upload_validation_failed:"文件校验失败，请重新选择",file_signature_mismatch:"文件内容与扩展名不一致",file_type_not_allowed:"文件类型不受支持",unsupported_country:"地址国家暂不支持",account_restricted:"账户当前受到限制"};return map[code]||"实名认证暂时无法提交，请稍后重试"}
async function submitIdentityToCloud(event){
  if(!identityDocumentState?.valid){setIdentityMessage("请先选择清晰的证件图片或 PDF","error");return}
  const name=$("#identityName").value.trim();
  if(!name){setIdentityMessage("请填写与证件一致的姓名","error");return}
  const address=accountDefaultAddress(),country=normalizeCountryCode(address?.country||appState.location.country,"");
  if(!country){setIdentityMessage("请先在地址簿选择国家","error");return}
  const file=$("#identityDocument")?.files?.[0];
  if(!file){setIdentityMessage("请重新选择证件文件","error");return}
  const submit=$("#identitySubmitButton");
  if(submit)submit.disabled=true;
  setIdentityMessage("正在上传并校验证件…");
  try{
    const result=await platformCloud.submitIdentity({legalName:name,docType:$("#identityDocType").value,countryCode:country,file});
    const application={schemaVersion:2,id:String(result.id),userId:identityUserId(),name,email:appState.userEmail||"",docType:$("#identityDocType").value,fileName:file.name,mimeType:file.type,fileSize:file.size,previewDataUrl:identityDocumentState.previewDataUrl||"",previewMimeType:identityDocumentState.previewMimeType||"",submittedAt:new Date().toISOString(),country,countryCode:country,nationality:commerce.countryName(country),risk:"等待安全扫描",cloud:true,cloudStatus:"pending"};
    persistIdentityApplication(application);
    appState.identitySubmitted=true;
    renderIdentityStatus();
    closeModal("identityModal");
    showToast("实名认证资料已提交，等待平台审核","clock-3");
  } finally {
    if(submit)submit.disabled=false;
  }
}
function renderIdentityUpload(){const zone=$("#identityUploadZone"),empty=$("#identityUploadEmpty"),preview=$("#identityFilePreview"),visual=$("#identityPreviewVisual");if(!zone||!empty||!preview||!visual)return;const hasFile=Boolean(identityDocumentState?.valid);zone.classList.toggle("has-file",hasFile);empty.hidden=hasFile;preview.hidden=!hasFile;visual.replaceChildren();if(!hasFile){renderIcons();return}if(identityDocumentState.previewDataUrl&&identityDocumentState.mimeType.startsWith("image/")){const image=document.createElement("img");image.src=identityDocumentState.previewDataUrl;image.alt="已选择证件预览";visual.append(image)}else{const icon=document.createElement("i");icon.dataset.lucide="file-text";visual.append(icon)}$("#identityFileName").textContent=identityDocumentState.fileName;$("#identityFileMeta").textContent=`${identityDocumentState.mimeType==="application/pdf"?"PDF":"图片"} · ${formatIdentityFileSize(identityDocumentState.fileSize)}`;renderIcons()}
function readFileAsDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=()=>reject(reader.error||new Error("file_read_failed"));reader.readAsDataURL(file)})}
async function compressIdentityImage(file){const source=await readFileAsDataUrl(file);return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{try{const maxEdge=900,scale=Math.min(1,maxEdge/Math.max(image.naturalWidth||1,image.naturalHeight||1)),canvas=document.createElement("canvas"),context=canvas.getContext("2d");canvas.width=Math.max(1,Math.round((image.naturalWidth||1)*scale));canvas.height=Math.max(1,Math.round((image.naturalHeight||1)*scale));context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.72))}catch(error){reject(error)}};image.onerror=()=>reject(new Error("image_decode_failed"));image.src=source})}
async function prepareIdentityFile(file){const mimeType=normalizedIdentityFileType(file);if(!mimeType)throw new Error("仅支持 JPG、PNG、WebP 或 PDF 文件");if(file.size<=0)throw new Error("这个文件是空的，请重新选择");if(file.size>identityMaxFileSize)throw new Error("文件超过 8 MB，请压缩后再上传");if(mimeType==="application/pdf"){const signature=String.fromCharCode(...new Uint8Array(await file.slice(0,5).arrayBuffer()));if(signature!=="%PDF-")throw new Error("PDF 文件内容无效，请重新导出后上传")}const previewDataUrl=mimeType==="application/pdf"?"":await compressIdentityImage(file);return {valid:true,fileName:file.name,mimeType,fileSize:file.size,previewDataUrl,previewMimeType:previewDataUrl?"image/jpeg":""}}
function loadIdentityApplicationIntoForm(){identityFileReadToken+=1;const application=currentIdentityApplication(),state=currentIdentityStatus(application);$("#identityName").value=application?.name||(appState.loggedIn?appState.userName:"");$("#identityDocType").value=application?.docType||"护照";$("#identityDocument").value="";identityDocumentState=application?{valid:true,fileName:application.fileName,mimeType:application.mimeType,fileSize:application.fileSize,previewDataUrl:application.previewDataUrl||"",previewMimeType:application.previewMimeType||""}:null;$("#identitySubmitButton").textContent=state.status==="pending"?"重新提交审核":state.status==="rejected"?"重新提交审核":"提交审核";setIdentityMessage("");renderIdentityUpload()}
function renderIdentityStatus(){const statusElement=$("#identityStatus"),header=$("#headerIdentityStatus"),button=$("#openIdentityButton");if(!statusElement||!header||!button)return;const application=currentIdentityApplication(),{status,review}=currentIdentityStatus(application),meta={unsubmitted:{label:"尚未认证",header:"未完成实名认证",icon:"shield-check",button:"开始认证"},pending:{label:"审核中",header:"实名认证审核中",icon:"clock-3",button:"查看申请"},approved:{label:"已认证",header:"实名认证已通过",icon:"badge-check",button:"认证已完成"},rejected:{label:`未通过${review?.reason?`：${review.reason}`:""}`,header:"实名认证未通过",icon:"circle-x",button:"重新认证"}}[status]||null;if(!meta)return;appState.identitySubmitted=Boolean(application);statusElement.textContent=meta.label;statusElement.className=`identity-status ${status}`;header.className=`verified-badge identity-header-status ${status}`;header.innerHTML=`<i data-lucide="${meta.icon}"></i>${safeText(meta.header)}`;button.textContent=meta.button;button.disabled=status==="approved";renderIcons()}
function persistIdentityApplication(application){const applications=getIdentityApplications(),updated=[application,...applications.filter(entry=>entry.id!==application.id)];try{localStorage.setItem(identityApplicationStorageKey,JSON.stringify(updated));return true}catch{return false}}
function requireIdentityApproval(action){if(!requireLogin(action))return false;const {status,review}=currentIdentityStatus();if(status==="approved")return true;goToView("settings");document.querySelector('[data-settings-target="identity"]')?.click();if(status==="pending"){showToast("实名认证正在审核，通过后才可以继续交易","clock-3");return false}loadIdentityApplicationIntoForm();openModal("identityModal");if(status==="rejected")setIdentityMessage(review?.reason?`上次未通过：${review.reason}`:"请重新提交清晰、有效的证件资料","error");else setIdentityMessage("完成实名认证后才可以继续交易");return false}
function updateAccount(){$("#railUser").hidden=!appState.loggedIn;$(".profile-name").textContent=appState.loggedIn?appState.userName:"游客";$("#railUserName").textContent=appState.loggedIn?appState.userName:"游客";$(".profile-button .avatar").textContent=appState.loggedIn?appState.userName.slice(0,1).toUpperCase():"G";$("#settingsName").textContent=appState.loggedIn?appState.userName:"游客";identityFileReadToken+=1;identityDocumentState=null;renderIdentityStatus();renderAccountAddressUi();if($("#postAddress"))populatePostAddresses()}
function bindViewNavigation(){$$('[data-view],[data-view-target],[data-view-link]').forEach(button=>button.addEventListener("click",event=>{event.preventDefault();const view=button.dataset.view||button.dataset.viewTarget||button.dataset.viewLink;if(view)goToView(view)}))}
function bindAuth(){
  $("#profileButton").addEventListener("click",()=>appState.loggedIn?goToView("settings"):openModal("authModal"));
  $("#railLogout").addEventListener("click",async()=>{if(cloudAuthMode==="v2"||cloudAuthMode==="legacy")await cloudAuth?.signOut().catch(error=>console.warn("CampusLoop cloud sign out failed",error));clearCurrentUser();showToast("已退出当前账号")});
  $$('[data-auth-mode]').forEach(button=>button.addEventListener("click",()=>{$$('[data-auth-mode]').forEach(tab=>tab.classList.toggle("active",tab===button));const register=button.dataset.authMode==="register";$("#authNameField").hidden=!register;$("#authCodeHint").hidden=!register;$("#authTitle").textContent=register?"创建 CampusLoop 账号":"登录 CampusLoop";$("#authForm .primary-button").textContent=register?"注册并进入":"登录账号"}));
  $("#authForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const register=!$("#authNameField").hidden,identifier=$("#authIdentifier").value.trim(),password=$("#authPassword").value,name=$("#authName").value.trim();
    if(!identifier||!password||(register&&!name)){ $("#authMessage").textContent="请完整填写账号信息。";$("#authMessage").className="form-message error";return }
    if(password.length<6){$("#authMessage").textContent="密码至少需要 6 位。";$("#authMessage").className="form-message error";return}
    $("#authMessage").className="form-message";
    try{await cloudAuthReady}catch{}
    const useCloud=(cloudAuthMode==="v2"||cloudAuthMode==="legacy")&&identifier.includes("@");
    if((cloudAuthMode==="v2"||cloudAuthMode==="legacy")&&!identifier.includes("@")){$("#authMessage").textContent="当前云端尚未启用手机号登录，请先使用邮箱账号；短信登录将在启用 SMS 后开放。";$("#authMessage").className="form-message error";return}
    if(useCloud){
      const submit=$("#authForm .primary-button");submit.disabled=true;$("#authMessage").textContent=register?"正在创建安全账号…":"正在登录…";
      try{const result=register?await cloudAuth.signUp({name,email:identifier,password}):await cloudAuth.signIn({email:identifier,password});if(result.needsEmailConfirmation){$("#authMessage").textContent="验证邮件已发送，请完成邮箱验证后再登录。";$("#authMessage").className="form-message success";return}if(!result.user)throw new Error("auth_user_missing");applyCloudAuthUser(result.user);await refreshPlatformCloudForCurrentUser();closeModal("authModal");showToast(register?"注册成功，已使用账户默认地址":"登录成功，已恢复账户默认地址","map-pin");return}catch(error){console.error("CampusLoop user authentication failed",error);$("#authMessage").textContent=error?.message==="Invalid login credentials"?"邮箱或密码不正确。":"登录服务暂时不可用，请稍后重试。";$("#authMessage").className="form-message error";return}finally{submit.disabled=false}
    }
    const storedUser=storedUserForContact(identifier),userName=register?(name||"CampusLoop 用户"):storedUser?.name||"Lena",userId=storedUser?.id||accountUserId(userName),restriction=activeAccountRestriction(userId);
    if(restriction){$("#authMessage").textContent=accountRestrictionMessage(restriction);$("#authMessage").className="form-message error";return}
    if(!register&&!storedUser){$("#authMessage").textContent="没有找到这个账号，请先注册。";$("#authMessage").className="form-message error";return}
    appState.loggedIn=true;appState.userId=userId;appState.userName=userName;appState.userEmail=identifier.includes("@")?identifier:"";updateAccount();useAccountDefaultLocation();rememberCurrentUser(identifier);persistAuthSession();$("#authMessage").textContent="";$("#authMessage").className="form-message";closeModal("authModal");showToast(register?"注册成功，已使用账户默认地址":"登录成功，已恢复账户默认地址","map-pin");
  });
  window.addEventListener("storage",event=>{if(event.key===accountRestrictionStorageKey)enforceCurrentUserRestriction();if(event.key===authSessionStorageKey){if(event.newValue){try{const session=JSON.parse(event.newValue);if(!activeAccountRestriction(session.userId))applyAuthSession(session)}catch{}}else if(appState.loggedIn)clearCurrentUser({broadcast:false})}})
}
function bindMentorAuth(){const form=$("#mentorAuthForm"),submit=$("#mentorAuthSubmit");form.addEventListener("submit",async event=>{event.preventDefault();if(submit.disabled)return;const username=$("#mentorUsername").value.trim(),password=$("#mentorPassword").value;submit.disabled=true;submit.innerHTML='<i data-lucide="loader-circle"></i>正在验证…';setMentorAuthMessage("");renderIcons();try{const account=await authenticateMentor(username,password);$("#mentorPassword").value="";if(!account){setMentorAuthMessage("账号或密码不正确，请重新输入。","error");$("#mentorPassword").focus();return}persistMentorSession(account);closeModal("mentorAuthModal");applyTutorMode("mentor");renderMentorAccount();showToast(`已以 ${account.username} 身份登录`,"badge-check")}catch{setMentorAuthMessage("当前浏览器无法安全验证，请刷新页面后重试。","error")}finally{submit.disabled=false;submit.innerHTML='<i data-lucide="log-in"></i>登录辅导员端';renderIcons()}});$("#mentorLogoutButton").addEventListener("click",logoutMentor);renderMentorAccount()}
function citiesForCountry(code){const entry=locationCatalog[code]||{};const cities=(entry.c||[]).map(pair=>pair[0]).filter(Boolean);const regions=Object.values(entry.s||{});return [...new Set(cities.length?cities:regions)].sort((a,b)=>a.localeCompare(b,"en"))}
function fillLocationSelect(select,options,placeholder,selected){select.replaceChildren(new Option(placeholder,""));options.forEach(option=>select.append(new Option(option.label||option,option.value||option)));if(selected&&[...select.options].some(option=>option.value===selected))select.value=selected}
function populateLocationCountries(){const select=$("#locationCountry");fillLocationSelect(select,countryEntries.map(entry=>({label:`${entry.zh} · ${entry.en}`,value:entry.code})),"请选择国家",appState.location.country);populateLocationCities(select.value)}
function populateLocationCities(country=$("#locationCountry").value||""){const cities=country?citiesForCountry(country):[];fillLocationSelect($("#locationCity"),cities,"请选择城市",appState.location.country===country?appState.location.city:"");if(country&&!$("#locationCity").value&&cities.length)$("#locationCity").value=cities[0]}
function accountDefaultAddress(){return getAddresses().find(entry=>entry.isDefault)||null}
function renderAccountAddressUi(){const profileLocation=$(".profile-location"),address=appState.loggedIn?accountDefaultAddress():null;if(profileLocation)profileLocation.innerHTML=`<i data-lucide="map-pin"></i>${address?`${safeText(address.city)} · ${safeText(addressCountryName(address.country))}`:"地址未选择"}`}
function applyLocationUi(){const selected=hasBrowseLocation(),areaLabel=selected?`${appState.location.city} · ${commerce.countryName(appState.location.country)}`:"地址未选择";if($("#railLocation"))$("#railLocation").textContent=selected?appState.location.city:areaLabel;if($("#topLocation"))$("#topLocation").textContent=areaLabel;if($("#marketLocationButton span"))$("#marketLocationButton span").textContent=areaLabel;[$("#railLocationButton"),$("#topLocationButton"),$("#marketLocationButton")].forEach(element=>{element?.classList.toggle("is-empty",!selected);element?.setAttribute("aria-label",selected?`浏览地区：${areaLabel}`:"地址未选择")});applyMarketCurrencyUi()}
function setAppLocation(location,{source="manual",refresh=true}={}){const previousCountry=accountMarketCountry(),country=normalizeCountryCode(location?.country,""),city=String(location?.city||"").trim(),entry=countryEntries.find(item=>item.code===country);if(!country||!city){clearAppLocation({refresh});return}appState.location={country,countryName:entry?.en||country,city};appState.locationSource=source;if(previousCountry!==country){if($("#minPrice"))$("#minPrice").value="";if($("#maxPrice"))$("#maxPrice").value=""}applyLocationUi();if(refresh&&$("#itemGrid"))renderMarket();if(cloudAuthMode==="v2")hydrateCloudMarketItems();renderIcons()}
function clearAppLocation({refresh=true}={}){const hadLocation=hasBrowseLocation();appState.location={country:"",countryName:"",city:""};appState.locationSource="none";if(hadLocation){if($("#minPrice"))$("#minPrice").value="";if($("#maxPrice"))$("#maxPrice").value=""}applyLocationUi();if($("#postAddress"))populatePostAddresses();if(refresh&&$("#itemGrid"))renderMarket();if(cloudAuthMode==="v2")hydrateCloudMarketItems({refresh:false});renderIcons()}
function useAccountDefaultLocation(){const address=accountDefaultAddress();if(address)setAppLocation({country:address.country,city:address.city},{source:"account"});else clearAppLocation()}
function hydrateLocation(){appState.location={country:"",countryName:"",city:""};appState.locationSource="none"}
function openLocationPicker(){if(!requireLogin("选择浏览地区"))return;populateLocationCountries();openModal("locationModal")}
function bindLocation(){populateLocationCountries();$("#locationCountry").addEventListener("change",()=>populateLocationCities($("#locationCountry").value));[$("#railLocationButton"),$("#topLocationButton"),$("#marketLocationButton")].forEach(button=>{button?.addEventListener("click",openLocationPicker);if(button?.getAttribute("role")==="button")button.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openLocationPicker()}})});document.addEventListener("click",event=>{if(event.target.closest("[data-open-location]"))openLocationPicker()});$("#locationForm").addEventListener("submit",event=>{event.preventDefault();setAppLocation({country:$("#locationCountry").value,city:$("#locationCity").value},{source:"manual"});closeModal("locationModal");showToast(`浏览地区已更新为 ${appState.location.city}，不会修改账户地址`,"map-pin")})}
function isLegacyDemoAddressSet(addresses){return Array.isArray(addresses)&&addresses.length===legacyDemoAddresses.length&&legacyDemoAddresses.every(expected=>{const address=addresses.find(entry=>entry?.id===expected.id),keys=Object.keys(expected);return address&&Object.keys(address).length===keys.length&&keys.every(key=>address[key]===expected[key])})}
function migrateLegacyDemoAddresses(){const stored=readStoredJson(addressStorageKey);if(!isLegacyDemoAddressSet(stored))return;try{localStorage.setItem(addressStorageKey,JSON.stringify(initialAddresses))}catch{}}
function getAddresses(){const stored=readStoredJson(addressStorageKey),addresses=Array.isArray(stored)?stored:initialAddresses;return addresses.map(address=>({...address,country:normalizeCountryCode(address.country)}))}
function saveAddresses(addresses){localStorage.setItem(addressStorageKey,JSON.stringify(addresses));if($("#postAddress"))populatePostAddresses();populateTutorRequestAddresses()}
async function syncAddressToCloud(address){
  if(!platformCloud)return;
  try{
    const result=await platformCloudReady;
    if(result?.mode!=="v2"||!result.user?.id)return;
    const saved=await platformCloud.saveAddress(address);
    const addresses=getAddresses().map(entry=>entry.id===address.id?{...entry,...saved}:entry);
    saveAddresses(addresses);
    syncDefaultAddress();
    renderAddressBook();
  }catch(error){
    console.warn("CampusLoop address cloud sync failed",error);
    showToast("地址已保存在本机，但云端同步失败，请稍后重试","cloud-off");
  }
}
async function deleteAddressFromCloud(id){
  if(!platformCloud)return;
  try{
    const result=await platformCloudReady;
    if(result?.mode!=="v2"||!result.user?.id||!/^[0-9a-f-]{36}$/i.test(String(id)))return;
    await platformCloud.deleteAddress(id);
  }catch(error){
    console.warn("CampusLoop address cloud delete failed",error);
    showToast("本机已删除，但云端删除失败，请刷新后重试","cloud-off");
  }
}
function bindCloudAddressEvents(){
  const form=$("#addressForm"), pane=$('[data-settings-pane="addresses"]'), deleteButton=$("#deleteAddressButton");
  form?.addEventListener("submit",event=>{
    const data=new FormData(form), before={
      id:String(data.get("id")||""),
      name:String(data.get("name")||"").trim(),
      city:String(data.get("city")||"").trim(),
      detail:String(data.get("detail")||"").trim()
    };
    queueMicrotask(()=>{
      const saved=getAddresses().find(entry=>before.id&&entry.id===before.id)
        || getAddresses().find(entry=>entry.name===before.name&&entry.city===before.city&&entry.detail===before.detail);
      if(saved)syncAddressToCloud(saved);
    });
  });
  deleteButton?.addEventListener("click",()=>{
    const id=String($("#addressId")?.value||"");
    queueMicrotask(()=>{if(id&&!getAddresses().some(entry=>entry.id===id))deleteAddressFromCloud(id)});
  });
  pane?.addEventListener("click",event=>{
    const button=event.target.closest("[data-default-address]");
    if(!button)return;
    queueMicrotask(()=>{
      const saved=getAddresses().find(entry=>entry.id===button.dataset.defaultAddress);
      if(saved)syncAddressToCloud({...saved,isDefault:true});
    });
  });
}
function addressCountryName(code){const normalized=normalizeCountryCode(code);return countryEntries.find(entry=>entry.code===normalized)?.zh||normalized}
function syncDefaultAddress(){const address=accountDefaultAddress();renderAccountAddressUi();if(appState.loggedIn&&appState.locationSource!=="manual"){if(address)setAppLocation({country:address.country,city:address.city},{source:"account"});else clearAppLocation()}populateTutorRequestAddresses(address?.id||"")}
function renderAddressBook(){const list=$("#addressList");if(!list)return;const addresses=getAddresses(),count=$("#addressCount");if(count)count.textContent=`${addresses.length} 个地址`;list.innerHTML=addresses.length?addresses.map(address=>`<article class="address-entry ${address.isDefault?"default":""}"><div class="address-entry-main"><div class="address-entry-labels"><span class="address-label">${safeText(address.label||"其他")}</span>${address.isDefault?'<span class="default-chip">默认地址</span>':""}</div><strong>${safeText(address.name||address.city)}</strong><p>${safeText(address.detail)}${address.postalCode?` · ${safeText(address.postalCode)}`:""}</p><small><i data-lucide="map-pin"></i>${safeText(address.city)} · ${safeText(addressCountryName(address.country))}</small></div><div class="address-entry-actions">${address.isDefault?'<span class="default-check" title="当前默认地址"><i data-lucide="circle-check"></i></span>':`<button class="icon-button soft" data-default-address="${safeText(address.id)}" type="button" title="设为默认地址"><i data-lucide="star"></i></button>`}<button class="icon-button soft" data-edit-address="${safeText(address.id)}" type="button" title="编辑地址"><i data-lucide="pencil"></i></button></div></article>`).join(""):'<div class="address-empty"><i data-lucide="map-pinned"></i><strong>还没有保存地址</strong><span>添加常用地址后，发布和交易时无需重复填写。</span><button class="primary-button small" data-empty-add-address type="button"><i data-lucide="plus"></i>新增地址</button></div>';renderIcons()}
function populateAddressCities(selected=""){const country=$("#addressCountry").value,cities=citiesForCountry(country);fillLocationSelect($("#addressCity"),cities,"请选择城市",selected);if(!$("#addressCity").value&&cities.length)$("#addressCity").value=cities[0]}
function openAddressEditor(id=""){const form=$("#addressForm"),address=getAddresses().find(entry=>entry.id===id),defaultAddress=accountDefaultAddress(),defaultCountry=address?.country||defaultAddress?.country||appState.location.country||"CN",defaultCity=address?.city||defaultAddress?.city||appState.location.city||(defaultCountry==="CN"?"Beijing":"");form.reset();$("#addressId").value=address?.id||"";$("#addressModalTitle").textContent=address?"编辑地址":"新增地址";$("#deleteAddressButton").hidden=!address;fillLocationSelect($("#addressCountry"),countryEntries.map(entry=>({label:`${entry.zh} · ${entry.en}`,value:entry.code})),"请选择国家",defaultCountry);if(!$("#addressCountry").value)$("#addressCountry").value="CN";populateAddressCities(defaultCity);$("#addressLabel").value=address?.label||"住处";$("#addressName").value=address?.name||"";$("#addressDetail").value=address?.detail||"";$("#addressPostalCode").value=address?.postalCode||"";$("#addressDefault").checked=address?.isDefault||getAddresses().length===0;openModal("addressModal")}
function setupAddressBook(){const pane=$('[data-settings-pane="addresses"]'),card=pane?.querySelector(".surface-card"),addButton=card?.querySelector(".card-heading .primary-button");if(!pane||!card||$("#addressList"))return;addButton.id="addAddressButton";card.querySelectorAll(".address-card").forEach(address=>address.remove());card.querySelector(".card-heading>div").insertAdjacentHTML("beforeend",'<span class="address-count" id="addressCount"></span>');card.insertAdjacentHTML("beforeend",'<div class="address-list" id="addressList"></div>');document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop" id="addressModal" hidden><section class="modal-dialog address-dialog" role="dialog" aria-modal="true" aria-labelledby="addressModalTitle"><button class="modal-close" data-close-modal="addressModal" type="button" aria-label="关闭"><i data-lucide="x"></i></button><p class="section-kicker">ADDRESS BOOK</p><h2 id="addressModalTitle">新增地址</h2><p class="modal-copy">保存常用地址，发布需求和查看本地内容时自动使用。</p><form id="addressForm"><input id="addressId" name="id" type="hidden"><div class="address-form-grid"><label>国家<select id="addressCountry" name="country" required></select></label><label>城市<select id="addressCity" name="city" required></select></label><label>地址标签<select id="addressLabel" name="label" required><option>住处</option><option>学校</option><option>公司</option><option>家人</option><option>其他</option></select></label><label>地址名称<input id="addressName" name="name" required maxlength="50" placeholder="例如：宿舍、公寓或学校名称"></label></div><label>详细地址<textarea id="addressDetail" name="detail" rows="3" required maxlength="180" placeholder="街道、楼栋、房间等详细信息"></textarea></label><label>邮政编码<input id="addressPostalCode" name="postalCode" maxlength="20" autocomplete="postal-code" placeholder="选填"></label><label class="address-default-option"><input id="addressDefault" name="isDefault" type="checkbox"><span><strong>设为默认地址</strong><small>市场、辅导和发布表单会优先使用此地址</small></span></label><div class="address-form-actions"><button class="danger-button" id="deleteAddressButton" type="button" hidden><i data-lucide="trash-2"></i>删除</button><button class="primary-button" type="submit">保存地址<i data-lucide="check"></i></button></div></form></section></div>`);$("#addressCountry").addEventListener("change",()=>populateAddressCities());addButton.addEventListener("click",()=>openAddressEditor());pane.addEventListener("click",event=>{const edit=event.target.closest("[data-edit-address]"),makeDefault=event.target.closest("[data-default-address]"),emptyAdd=event.target.closest("[data-empty-add-address]");if(edit)openAddressEditor(edit.dataset.editAddress);if(emptyAdd)openAddressEditor();if(makeDefault){const addresses=getAddresses().map(address=>({...address,isDefault:address.id===makeDefault.dataset.defaultAddress}));saveAddresses(addresses);syncDefaultAddress(true);renderAddressBook();showToast("默认地址已更新","map-pin")}});$("#addressForm").addEventListener("submit",event=>{event.preventDefault();const data=new FormData(event.target),id=String(data.get("id")||""),addresses=getAddresses(),existing=addresses.find(address=>address.id===id),makeDefault=data.get("isDefault")==="on"||addresses.length===0||existing?.isDefault,newAddress={id:id||`address-${Date.now()}`,label:String(data.get("label")),name:String(data.get("name")).trim(),country:String(data.get("country")),city:String(data.get("city")),detail:String(data.get("detail")).trim(),postalCode:String(data.get("postalCode")||"").trim(),isDefault:makeDefault};let updated=existing?addresses.map(address=>address.id===id?newAddress:address):[...addresses,newAddress];if(makeDefault)updated=updated.map(address=>({...address,isDefault:address.id===newAddress.id}));saveAddresses(updated);syncDefaultAddress(makeDefault);renderAddressBook();closeModal("addressModal");showToast(existing?"地址已更新":"地址已添加","map-pin")});$("#deleteAddressButton").addEventListener("click",()=>{const id=$("#addressId").value,address=getAddresses().find(entry=>entry.id===id);if(!address||!window.confirm(`确定删除“${address.name}”吗？`))return;const wasDefault=address.isDefault,updated=getAddresses().filter(entry=>entry.id!==id);if(wasDefault&&updated.length)updated[0].isDefault=true;saveAddresses(updated);syncDefaultAddress(wasDefault);renderAddressBook();closeModal("addressModal");showToast("地址已删除","trash-2")});window.addEventListener("storage",event=>{if(event.key===addressStorageKey){syncDefaultAddress();renderAddressBook()}});syncDefaultAddress();renderAddressBook()}
function bindMarket(){ $$('[data-category]').forEach(button=>button.addEventListener("click",()=>{appState.category=button.dataset.category;$$('[data-category]').forEach(tab=>tab.classList.toggle("active",tab===button));renderMarket()}));[$("#marketSearch"),$("#marketSort"),$("#minPrice"),$("#maxPrice")].forEach(input=>input?.addEventListener("input",renderMarket));$("#clearMarketFilters").addEventListener("click",()=>{appState.category="all";$("#marketSearch").value="";$("#minPrice").value="";$("#maxPrice").value="";$("#marketSort").value="newest";$$('[data-category]').forEach(tab=>tab.classList.toggle("active",tab.dataset.category==="all"));renderMarket()});$("#marketFilterButton").addEventListener("click",()=>$("#filterPanel").classList.toggle("open"));$("#openPostButton").addEventListener("click",()=>goToView("marketPost"));$("#globalSearch").addEventListener("input",event=>{if(appState.view!=="market")goToView("market");$("#marketSearch").value=event.target.value;renderMarket()});document.addEventListener("click",event=>{const favorite=event.target.closest("[data-favorite]");if(favorite){favorite.classList.toggle("active");favorite.querySelector("svg")?.setAttribute("fill",favorite.classList.contains("active")?"currentColor":"none");showToast(favorite.classList.contains("active")?"已加入收藏":"已取消收藏","heart");return}const card=event.target.closest(".item-card");if(card&&!event.target.closest("button"))showProduct(card.dataset.itemId)})}
function bindTutoring(){
  $$('[data-tutor-mode]').forEach(button=>button.addEventListener("click",()=>{
    if(button.dataset.tutorMode==="mentor"&&!currentMentorAccount()){
      openMentorAuth();
      return;
    }
    applyTutorMode(button.dataset.tutorMode);
  }));

  $("#requestForm").addEventListener("submit",async event=>{
    event.preventDefault();
    if(!requireLogin("发布辅导需求"))return;
    const data=new FormData(event.target);
    const address=getAddresses().find(entry=>String(entry.id)===String(data.get("addressId")));
    if(!address){showToast("请先在设置中添加并选择地址","map-pin");return}
    const files=[...(event.target.querySelector('input[type="file"]')?.files||[])];
    const file=files.length?[...new Set(files.map(entry=>entry.name.split(".").pop()?.toUpperCase()||"文件"))].join("、"):"未附文件";
    const countryCode=String(address.country).toUpperCase();
    const request={
      schemaVersion:2,
      id:`tutor-${Date.now()}`,
      studentId:`local-${appState.userName.toLowerCase().replace(/[^a-z0-9]+/g,"-")||"user"}`,
      subject:String(data.get("subject")).trim(),
      majorCategory:$("#majorCategory").value,
      major:String(data.get("major")),
      type:String(data.get("type")),
      deadline:String(data.get("deadline")),
      brief:String(data.get("brief")).trim(),
      file,
      addressSnapshot:{addressId:address.id,countryCode,countryName:commerce.countryName(countryCode),city:address.city},
      currencyCode:currencyForCountry(countryCode),
      submittedAt:new Date().toISOString(),
      status:"pending"
    };
    const submitButton=event.target.querySelector("[type=submit]");
    if(platformCloudMode==="v2"){
      if(request.brief.length<10){showToast("请至少填写 10 个字的作业要求","file-text");return}
      if(submitButton)submitButton.disabled=true;
      try{
        const fileIds=[];
        for(const attachment of files){
          const uploaded=await platformCloud.uploadFile({file:attachment,category:"tutoring_request"});
          if(uploaded?.fileId)fileIds.push(uploaded.fileId);
        }
        const result=await platformCloud.createTutoringRequest({addressId:address.id,subject:request.subject,majorCategory:request.majorCategory,major:request.major,type:request.type,mentorSummary:request.brief,brief:request.brief,deadline:request.deadline,fileIds});
        request.id=String(result.id);request.cloud=true;request.status="pending_review";request.file=fileIds.length?file:"未附文件";
        saveTutorRequest(request);
        showToast(`需求已提交，报价统一使用 ${request.currencyCode} · ${commerce.currencySymbol(request.currencyCode)}`,"send");
      }catch(error){
        console.error("CampusLoop tutoring request cloud submission failed",error);
        const messages={address_not_found:"地址已失效，请重新选择地址",invalid_deadline:"请选择未来的截止日期",invalid_private_brief:"作业要求至少需要 10 个字",invalid_request_file:"附件未通过安全校验",file_type_not_allowed:"附件类型不受支持",file_signature_mismatch:"附件内容与扩展名不一致",tutoring_access_restricted:"当前账户暂时不能发布辅导需求"};
        showToast(messages[error?.code]||"辅导需求暂时无法提交，请稍后重试","cloud-off");
        return;
      }finally{if(submitButton)submitButton.disabled=false}
    }else{
      saveTutorRequest(request);
      showToast(`需求已提交，报价统一使用 ${request.currencyCode} · ${commerce.currencySymbol(request.currencyCode)}`,"send");
    }
    event.target.reset();
    $("#majorCategory").dispatchEvent(new Event("change"));
    populateTutorRequestAddresses(address.id);
    renderMentorRequests();
    renderTutorWorkflow();
  });

  document.addEventListener("click",async event=>{
    const quoteButton=event.target.closest("[data-quote-request]");
    if(quoteButton){
      const account=requireMentorSession("提交辅导报价");
      if(!account)return;
      const request=tutorRequestById(quoteButton.dataset.quoteRequest);
      if(!request){showToast("该需求已更新，请刷新后重试","circle-alert");return}
      const savedQuote=tutorQuoteForRequest(request.id,account.id),form=$("#quoteForm");
      form.reset();
      form.elements.requestId.value=request.id;
      form.elements.subject.value=request.subject;
      form.elements.currencyCode.value=request.currencyCode;
      $("#quoteRequestLocation").value=`${request.addressSnapshot.countryName} · ${request.addressSnapshot.city}`;
      $("#quoteCurrencyDisplay").value=`${request.currencyCode} · ${commerce.currencySymbol(request.currencyCode)}`;
      $("#quoteRequestName").textContent=`为「${request.subject}」提交报价。币种由学生需求所在地锁定。`;
      if(savedQuote&&quoteCurrencyMatchesRequest(savedQuote,request)){
        form.elements.amount.value=savedQuote.amount;
        form.elements.billing.value=savedQuote.billing;
        form.elements.note.value=savedQuote.note||"";
      }
      openModal("quoteModal");
    }

    const acceptButton=event.target.closest("[data-accept-quote]");
    if(acceptButton){
      if(!requireIdentityApproval("接受辅导报价"))return;
      const request=tutorRequestById(acceptButton.dataset.requestId),quote=tutorQuoteForRequest(acceptButton.dataset.requestId);
      if(!request||!quote||quote.id!==acceptButton.dataset.quoteId||!quoteCurrencyMatchesRequest(quote,request)){showToast("报价已更新，请重新确认","circle-alert");return}
      if(platformCloudMode==="v2"){
        acceptButton.disabled=true;
        try{await platformCloud.selectTutoringQuote(quote.id)}catch(error){console.error("CampusLoop tutoring quote selection failed",error);acceptButton.disabled=false;const messages={identity_verification_required:"完成实名认证后才能接受报价",quote_currency_mismatch:"报价币种与需求所在地不一致",quote_not_available:"报价已失效，请刷新后重试"};showToast(messages[error?.code]||"报价暂时无法接受，请稍后重试","cloud-off");return}
        acceptButton.disabled=false;
      }
      saveTutorState(tutorStorage.selected,{schemaVersion:2,requestId:request.id,quoteId:quote.id,currencyCode:request.currencyCode,quoteFingerprint:tutorQuoteFingerprint(quote,request),selectedAt:new Date().toISOString(),cloud:platformCloudMode==="v2"});
      removeTutorState(tutorStorage.approved,request.id);
      renderTutorWorkflow();
      showToast("已接受报价，等待管理员确认","clock-3");
    }
  });

  $("#quoteForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const account=requireMentorSession("提交辅导报价");
    if(!account)return;
    const data=new FormData(event.target),request=tutorRequestById(data.get("requestId"));
    if(!request){showToast("需求不存在或已更新，请重新选择","circle-alert");return}
    const previous=tutorQuoteForRequest(request.id,account.id),currencyMatches=previous&&quoteCurrencyMatchesRequest(previous,request);
    const quote={
      schemaVersion:2,
      id:currencyMatches&&previous.id?previous.id:`quote-${Date.now()}`,
      requestId:request.id,
      subject:request.subject,
      mentorId:account.id,
      mentorName:account.username,
      currencyCode:request.currencyCode,
      currency:request.currencyCode,
      amount:Number(data.get("amount")),
      billing:String(data.get("billing")),
      note:String(data.get("note")||"").trim(),
      submittedAt:new Date().toISOString()
    };
    if(platformCloudMode==="v2"){
      const submit=event.target.querySelector("[type=submit]");if(submit)submit.disabled=true;
      try{
        const result=await platformCloud.submitTutoringQuote({requestId:request.id,amount:quote.amount,currencyCode:quote.currencyCode,billing:quote.billing,note:quote.note});
        quote.id=String(result.id);quote.cloud=true;quote.amountMinor=result.amountMinor;
      }catch(error){
        console.error("CampusLoop tutoring quote cloud submission failed",error);
        if(submit)submit.disabled=false;
        const messages={mentor_access_required:"当前账号不是可用的辅导员账号",request_not_open:"该需求还未开放报价或已截止",invalid_quote_amount:"请输入有效报价",selected_quote_cannot_be_replaced:"学生已选择旧报价，不能直接修改"};
        showToast(messages[error?.code]||"报价暂时无法提交，请稍后重试","cloud-off");
        return;
      }finally{if(submit)submit.disabled=false}
    }
    saveTutorQuote(quote);
    removeTutorState(tutorStorage.selected,request.id);
    removeTutorState(tutorStorage.approved,request.id);
    removeTutorMatchReview(request.id);
    closeModal("quoteModal");
    renderMentorRequests();
    renderTutorWorkflow();
    showToast(`报价已按 ${quote.currencyCode} 提交，等待学生选择`,"send");
  });

  document.addEventListener("submit",async event=>{
    if(event.target.id!=="orderChatForm")return;
    event.preventDefault();
    const input=event.target.querySelector("textarea"),messageText=input.value.trim();
    if(!messageText)return;
    if(!(cloudAuthMode==="v2"&&platformCloudMode==="v2"&&typeof platformCloud?.sendTutoringMessage==="function")){
      showToast("云端消息服务尚未连接，消息未发送给对方","cloud-off");
      renderTutorMessages();
      return;
    }
    const request=activeStudentRequest();
    if(!request){showToast("订单已更新，请刷新后重试","circle-alert");return}
    const messages=readStoredJson(tutorStorage.messages,[]);
    messages.push({side:"self",text:messageText,time:new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})+" · 发送中"});
    localStorage.setItem(tutorStorage.messages,JSON.stringify(messages));
    input.value="";
    renderTutorMessages();
    try{
      await platformCloud.sendTutoringMessage({requestId:request.id,text:messageText});
      messages[messages.length-1].time=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})+" · 已送达";
      localStorage.setItem(tutorStorage.messages,JSON.stringify(messages));
      renderTutorMessages();
      showToast("消息已送达","check-circle-2");
    }catch(error){
      localStorage.setItem(tutorStorage.messages,JSON.stringify(messages.slice(0,-1)));
      input.value=messageText;
      renderTutorMessages();
      const message=error?.code==="conversation_not_ready"?"管理员确认后正在建立会话，请稍后重试":"消息发送失败，内容已保留，请重试";
      showToast(message,"triangle-alert");
    }
  });

  window.addEventListener("storage",event=>{
    if(Object.values(tutorStorage).includes(event.key)){
      renderMentorRequests();
      renderTutorWorkflow();
    }
  });
}
function bindMessages(){
  const composer=$("#chatComposer"),input=$("#chatInput"),submit=composer?.querySelector("button[type='submit']"),status=$("#composerStatus");
  if(!composer)return;
  composer.addEventListener("submit",event=>{
    event.preventDefault();
    if(!requireLogin("发送订单消息"))return;
    showToast("普通私信已关闭。请等待管理员确认辅导订单后再沟通","shield-check");
    if(input)input.value="";
  });
  if(input)input.disabled=true;
  if(submit)submit.disabled=true;
  if(status)status.innerHTML='<i data-lucide="shield-check"></i>普通商品不开放私信';
  const connection=$("#appConnectionStatus");
  if(connection){connection.className="connection-badge local";connection.innerHTML='<i data-lucide="shield-check"></i>普通私信已关闭';}
  renderIcons();
}
function bindSettings(){
  const cloudIdentityForm=$("#identityForm");
  cloudIdentityForm?.addEventListener("submit",event=>{
    if(platformCloudMode!=="v2")return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitIdentityToCloud(event).catch(error=>{
      console.error("CampusLoop identity cloud submission failed",error);
      setIdentityMessage(identityCloudErrorMessage(error),"error");
    });
  },true);
  $$('[data-settings-target]').forEach(button=>button.addEventListener("click",()=>{
    $$('[data-settings-target]').forEach(item=>item.classList.toggle("active",item===button));
    $$('[data-settings-pane]').forEach(pane=>pane.classList.toggle("active",pane.dataset.settingsPane===button.dataset.settingsTarget));
  }));
  $("#openIdentityButton").addEventListener("click",()=>{
    if(!requireLogin("进行实名认证"))return;
    loadIdentityApplicationIntoForm();
    openModal("identityModal");
  });
  $("#identityDocument").addEventListener("change",async event=>{
    const file=event.target.files?.[0],token=++identityFileReadToken;
    identityDocumentState=null;
    renderIdentityUpload();
    setIdentityMessage("");
    if(!file)return;
    setIdentityMessage("正在读取文件…");
    try{
      const prepared=await prepareIdentityFile(file);
      if(token!==identityFileReadToken)return;
      identityDocumentState=prepared;
      setIdentityMessage("文件已准备好，可以提交审核","success");
      renderIdentityUpload();
    }catch(error){
      if(token!==identityFileReadToken)return;
      event.target.value="";
      identityDocumentState=null;
      setIdentityMessage(error.message||"文件无法读取，请重新选择","error");
      renderIdentityUpload();
    }
  });
  $("#identityFileRemove").addEventListener("click",event=>{
    event.preventDefault();
    event.stopPropagation();
    identityFileReadToken+=1;
    identityDocumentState=null;
    $("#identityDocument").value="";
    setIdentityMessage("已移除文件，请重新选择");
    renderIdentityUpload();
  });
  $("#identityForm").addEventListener("submit",event=>{
    event.preventDefault();
    if(!identityDocumentState?.valid){
      setIdentityMessage("请先选择清晰的证件图片或 PDF","error");
      $("#identityDocument").focus();
      return;
    }
    const name=$("#identityName").value.trim();
    if(!name){setIdentityMessage("请填写与证件一致的姓名","error");return}
    const id=`identity-${identityUserId()}`,identityAddress=accountDefaultAddress(),identityCountry=normalizeCountryCode(identityAddress?.country||appState.location.country),application={schemaVersion:1,id,userId:identityUserId(),name,email:appState.userEmail||"hello@example.com",docType:$("#identityDocType").value,fileName:identityDocumentState.fileName,mimeType:identityDocumentState.mimeType,fileSize:identityDocumentState.fileSize,previewDataUrl:identityDocumentState.previewDataUrl||"",previewMimeType:identityDocumentState.previewMimeType||"",submittedAt:new Date().toISOString(),country:identityCountry,nationality:commerce.countryName(identityCountry),documentNumber:"已加密保存",birthDate:"待人工核验",risk:"待人工核验"};
    if(!persistIdentityApplication(application)){
      setIdentityMessage("浏览器存储空间不足，请换一张更小的图片后重试","error");
      return;
    }
    const reviews=getIdentityReviews();
    if(Object.hasOwn(reviews,id)){
      delete reviews[id];
      if(Object.keys(reviews).length)localStorage.setItem(identityReviewStorageKey,JSON.stringify(reviews));else localStorage.removeItem(identityReviewStorageKey);
    }
    appState.identitySubmitted=true;
    renderIdentityStatus();
    closeModal("identityModal");
    showToast("资料已提交，管理员端已收到审核申请","clock-3");
  });
  window.addEventListener("storage",event=>{
    if(event.key===identityApplicationStorageKey||event.key===identityReviewStorageKey)renderIdentityStatus();
  });
  const privateLabel=[...document.querySelectorAll("strong")].find(element=>element.textContent.trim()==="新消息提醒");
  if(privateLabel){privateLabel.textContent="系统提醒";privateLabel.nextElementSibling.textContent="平台审核、服务费和安全提醒"}
  const privacyHeading=[...document.querySelectorAll("h2")].find(element=>element.textContent.trim()==="消息与隐私");
  if(privacyHeading)privacyHeading.textContent="通知与隐私";
  renderIdentityStatus();
}
function bindProduct(){const image=$("#productImage"),lightboxImage=$("#productLightboxImage"),trigger=$("#productImageTrigger"),lightboxMedia=$("#productLightboxMedia");image.addEventListener("load",()=>trigger.classList.remove("is-unavailable"));image.addEventListener("error",()=>trigger.classList.add("is-unavailable"));lightboxImage.addEventListener("load",()=>lightboxMedia.classList.remove("is-unavailable"));lightboxImage.addEventListener("error",()=>lightboxMedia.classList.add("is-unavailable"));trigger.addEventListener("click",()=>openModal("productImageModal"));$("#productOrderButton").addEventListener("click",()=>{if(requireIdentityApproval("创建交易订单"))showToast("实名认证已确认，可以创建交易订单","file-plus-2")});$("#productFavoriteButton").addEventListener("click",event=>{event.currentTarget.classList.toggle("active");showToast(event.currentTarget.classList.contains("active")?"已加入收藏":"已取消收藏","heart")})}
function bindModals(){$$('[data-close-modal]').forEach(button=>button.addEventListener("click",()=>closeModal(button.dataset.closeModal)));$$('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener("click",event=>{if(event.target===backdrop)closeModal(backdrop.id)}));document.addEventListener("keydown",event=>{if(event.key==="Escape")$$('.modal-backdrop:not([hidden])').forEach(modal=>closeModal(modal.id));if(event.key==="/"&&document.activeElement.tagName!=="INPUT"&&document.activeElement.tagName!=="TEXTAREA"){event.preventDefault();$("#globalSearch").focus()}})}
function init(){migrateLegacyDemoAddresses();hydrateAuthSession();hydrateLocation();hydrateMentorSession();cloudAuthReady=initializeCloudAuth();platformCloudReady=initializePlatformCloud();setupAcademicFields();setupTutorWorkflow();setupAddressBook();bindCloudAddressEvents();setupMarketPost();normalizeMarketPostControls();bindViewNavigation();bindAuth();bindMentorAuth();bindLocation();bindMarket();bindMarketPost();bindPublishedItemSync();bindTutoring();bindSettings();bindProduct();bindModals();applyTutorMode("student");renderMarket();renderMentorRequests();renderTutorWorkflow();updateAccount();applyLocationUi();window.addEventListener("hashchange",applyRouteFromLocation);window.addEventListener("popstate",applyRouteFromLocation);applyRouteFromLocation();renderIcons()}
function enforceMarketPostConstraints(){const price=$("#postPrice"),title=$("#postTitle"),description=$("#postDescription");if(price)price.min="0.01";if(title)title.minLength=2;if(description)description.minLength=1}
document.addEventListener("DOMContentLoaded",init);
document.addEventListener("DOMContentLoaded",enforceMarketPostConstraints);
