(function(){
"use strict";
const platforms=[
 {name:"BOSS直聘",url:"https://www.zhipin.com/",subtitle:"内地岗位 · 职位直达",accent:true},
 {name:"实习僧",url:"https://www.shixiseng.com/",subtitle:"实习 · 校招"},
 {name:"智联招聘",url:"https://www.zhaopin.com/",subtitle:"综合招聘 · 校招"},
 {name:"前程无忧",url:"https://www.51job.com/",subtitle:"综合招聘 · 社招"},
 {name:"JobsDB",url:"https://hk.jobsdb.com/",subtitle:"香港岗位"},
 {name:"LinkedIn Jobs",url:"https://www.linkedin.com/jobs/",subtitle:"国际 · 香港"}
];
function identify(value){
 try{
  const u=new URL(value);
  const host=u.hostname.toLowerCase();
  if(host==="zhipin.com"||host.endsWith(".zhipin.com"))return "BOSS直聘";
  if(host==="shixiseng.com"||host.endsWith(".shixiseng.com"))return "实习僧";
  if(host==="zhaopin.com"||host.endsWith(".zhaopin.com"))return "智联招聘";
  if(host==="51job.com"||host.endsWith(".51job.com"))return "前程无忧";
  if(host==="jobsdb.com"||host.endsWith(".jobsdb.com"))return "JobsDB";
  if(host==="linkedin.com"||host.endsWith(".linkedin.com"))return "LinkedIn Jobs";
  return "";
 }catch(_){return ""}
}
const style=document.createElement("style");
style.textContent=[
 ".platform-panel{margin-bottom:16px}",
 ".platform-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0}",
 ".platform-card{border:1px solid #d9e3f0;border-radius:11px;background:#fff;display:flex;flex-direction:column;gap:4px;padding:13px 15px;text-decoration:none;color:#234577!important;transition:background .15s}",
 ".platform-card:hover{background:#edf5ff;border-color:#97b6e4}",
 ".platform-card strong{font-size:14px}.platform-card small{color:#66768b;font-size:12px}",
 ".platform-card:first-child{border-color:#b7c8eb;background:#f5f8ff}",
 ".platform-guide{font-size:12px;line-height:1.8;color:#5d6c81}",
 ".platform-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}",
 ".platform-actions input{max-width:520px;flex:1;min-width:180px}",
 ".platform-actions button{white-space:nowrap}",
 "@media(max-width:750px){.platform-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}",
 "@media(max-width:460px){.platform-grid{grid-template-columns:1fr}}"
].join("");
document.head.appendChild(style);

const panel=document.createElement("section");
panel.className="panel platform-panel";
panel.innerHTML='<h2>更多招聘平台 · 快速浏览与导入</h2>'+
 '<p>打开招聘平台自主查看职位。找到感兴趣的岗位后，复制职位网址，回到此页填写公司及岗位名称保存。手动保存的职位也会参与评分和投递管理。</p>';
const grid=document.createElement("div");
grid.className="platform-grid";
for(const p of platforms){
 const a=document.createElement("a");a.className="platform-card";a.href=p.url;a.target="_blank";a.rel="noopener noreferrer";
 const strong=document.createElement("strong");strong.textContent=p.name+" ↗";
 const small=document.createElement("small");small.textContent=p.subtitle;
 a.append(strong,small);grid.appendChild(a);
}
panel.appendChild(grid);
const row=document.createElement("div");row.className="platform-actions";
const input=document.createElement("input");input.id="platform-job-url";input.type="url";input.placeholder="在这里粘贴 BOSS直聘或其他平台的职位链接";input.setAttribute("aria-label","职位分享链接");
const btn=document.createElement("button");btn.type="button";btn.textContent="填入下方添加表单";
const hint=document.createElement("div");hint.className="platform-guide";hint.textContent="这里不会抓取平台页面或读取你的招聘账号。导入仅保存你主动输入的信息。已有个人投递记录仍只存在当前浏览器，请定期导出备份。";
row.append(input,btn);
panel.append(row,hint);

const filterPanel=document.querySelector(".filters")?.closest(".panel");
const manualPanel=document.getElementById("add-form")?.closest(".panel");
if(filterPanel&&filterPanel.parentNode){
 filterPanel.insertAdjacentElement("afterend",panel);
}else if(manualPanel){
 manualPanel.insertAdjacentElement("beforebegin",panel);
}
const uInput=document.getElementById("new-url");
const source=document.getElementById("new-source");
const form=document.getElementById("add-form");
function updateSource(){
 const detected=identify(uInput.value);
 if(detected){
   // Keep manually edited custom sources; only overwrite blank or previously detected sources.
   if(!source.value.trim()||platforms.some(p=>p.name===source.value.trim())||source.dataset.auto==="1"){
    source.value=detected;
    source.dataset.auto="1";
   }
 }
}
if(uInput){uInput.addEventListener("input",updateSource);uInput.addEventListener("change",updateSource)}
if(source){source.addEventListener("input",()=>{source.dataset.auto="0"})}
btn.addEventListener("click",()=>{
 const url=input.value.trim();
 if(!/^https?:\/\//i.test(url)){alert("请先粘贴一个有效的 http(s) 职位链接。");return}
 try{new URL(url)}catch(_){alert("职位链接格式不正确");return}
 if(!form||!uInput)return;
 uInput.value=url;
 updateSource();
 form.scrollIntoView({behavior:"smooth",block:"center"});
 document.getElementById("new-company")?.focus({preventScroll:true});
});
if(form){
 form.addEventListener("submit",ev=>{
   const url=(uInput?.value||"").trim();
   if(!url)return;
   let parsed;
   try{parsed=new URL(url)}catch(_){return}
   const cleaned=parsed.origin+parsed.pathname.replace(/\/$/,"");
   if(Array.isArray(local.manual)&&local.manual.some(j=>{
    try{
      const p=new URL(j.apply_url||j.url||"");
      return p.origin+p.pathname.replace(/\/$/,"")===cleaned;
    }catch(_){return false}
   })){
    ev.preventDefault();ev.stopImmediatePropagation();
    alert("这个职位链接已经保存过了，请在职位列表中查看或更新状态。");
   }
 },true);
}
})();