(function(){
"use strict";
const baseRender=render;
let aiScores={};
function safeString(s){return String(s==null?"":s)}
function apply(){
 document.querySelectorAll("#list article.job").forEach(card=>{
  const select=card.querySelector("select.status");
  if(!select)return;
  const id=decodeURIComponent(select.dataset.id);
  const result=aiScores[id];
  if(!result)return;
  const scoreBox=card.querySelector(".score strong");
  if(scoreBox)scoreBox.textContent=result.score;
  const small=card.querySelector(".score small");
  if(small)small.textContent="AI参考分";
  const target=card.querySelector(".job-review")||card;
  const panel=document.createElement("div");
  panel.className="ai-review";
  panel.style.cssText="margin-top:10px;padding:11px 13px;background:#f0f6ff;border:1px solid #cbdcf6;border-radius:10px;font-size:12px;line-height:1.8;color:#344861";
  const title=document.createElement("strong");
  title.textContent="AI 参考评估 "+result.score+"/85 · "+(result.priority||"")+" · 可信度 "+(result.confidence||"low");
  panel.appendChild(title);
  const r=document.createElement("p");
  r.textContent=(result.reasons||[]).join("；");
  panel.appendChild(r);
  const caution=document.createElement("p");
  caution.textContent="仍需核实："+(result.cautions||[]).join("；");
  panel.appendChild(caution);
  target.appendChild(panel);
 });
}
render=function(){baseRender();apply()};
async function get(){
 try{
  const response=await fetch("data/ai_scores.json?t="+Date.now(),{cache:"no-store"});
  if(!response.ok)return;
  const data=await response.json();
  if(data&&typeof data.results==="object"&&data.results&&!Array.isArray(data.results)){
   aiScores=data.results;render();
  }
 }catch(_){}
}
get();
})();