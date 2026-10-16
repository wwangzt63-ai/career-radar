(function () {
  "use strict";
  if (typeof render !== "function" || typeof score !== "function" || typeof local === "undefined") return;
  if (!local.jd || typeof local.jd !== "object") local.jd = {};
  const style = document.createElement("style");
  style.textContent = ".job-review{border:1px solid #dbe5f4;background:#f8fbff;border-radius:12px;padding:12px 14px;margin-top:14px}.job-review summary{font-size:13px}.job-review .components{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:11px 0}.job-review .component{background:#fff;border:1px solid #e2e8f0;padding:9px;border-radius:9px;font-size:12px;color:#596b81}.job-review .component b{display:block;color:#273b57;font-size:16px}.job-review .note{font-size:12px;line-height:1.8;color:#596b81}.job-review .warn{color:#805e24}.job-review textarea,#new-description{display:block;width:100%;min-height:105px;resize:vertical;padding:10px;border:1px solid #d7e0ee;border-radius:9px;color:#233752;font:inherit;font-size:13px}.job-review .buttons{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}.job-review .buttons a{display:inline-block}.manual #new-description{grid-column:1/-1}.job-review label{display:block;margin:11px 0 6px;font-size:12px;color:#53657a}@media(max-width:580px){.job-review .components{grid-template-columns:repeat(2,minmax(0,1fr))}}";
  document.head.appendChild(style);

  function evaluate(j) {
    const description = String(local.jd[j.id] || j.description || "").slice(0,6000);
    const phrase = [j.title,j.program,...(j.positions||[]),j.industry,description].join(" ").toLowerCase();
    const locations = (j.locations||[]).join(" ").toLowerCase();
    const hi = /(房地产|地产开发|资产管理|投资分析|投资研究|投融资|基建投资|reits|asset management|investment analyst|project finance|infrastructure finance|project management|项目管理|商业分析|business analyst|consulting|咨询|management trainee|graduate programme|管培)/i;
    const mid = /(运营|项目|金融|finance|财务|esg|可持续|digital|数字化|策略|战略|产品|数据分析|corporate|管理)/i;
    const mismatch = /(施工员|施工技术员|测量员|土木设计|结构设计|后端开发|前端开发|算法工程师|嵌入式工程师|机电安装工)/i;
    const jobMatch = hi.test(phrase);
    const maybe = mid.test(phrase);
    const avoid = mismatch.test(phrase);
    let direction = avoid ? 4 : jobMatch ? 27 : maybe ? 19 : 8;
    let skills = avoid ? 7 : jobMatch ? 20 : maybe ? 15 : 9;
    if (/(工程|建造|bim|成本|地产|建筑|数字化|project|finance|金融)/i.test(phrase)) skills = Math.min(25, skills+3);
    let cohort = /2027/.test(j.cohort) ? 19 : /(不限|any|all)/i.test(j.cohort) ? 13 : j.cohort ? 0 : 7;
    let deadline = 5;
    let risks = [];
    if (j.deadline) {
      const days = Math.ceil((Date.parse(j.deadline+"T23:59:59") - Date.now())/86400000);
      deadline = days < 0 ? 0 : days <= 14 ? 10 : 8;
      if (days >= 0 && days <= 7) risks.push("标注截止日期在7天内，需尽快核实");
      if (days < 0) risks.push("来源标注的截止日期已过");
    } else risks.push("申请截止日期未知");
    let geography = /(香港|深圳|hong kong|shenzhen)/i.test(locations) ? 10 : /(广州|东莞|珠海|佛山|惠州|中山|澳门|guangzhou|dongguan)/i.test(locations) ? 7 : /(全国|不限|各地)/.test(locations) ? 5 : locations ? 1 : 3;
    const evidence = Math.min(5,(j.apply_url ? 3 : 1)+(j.confirmed_by>=2 ? 2 : 0));
    let total = direction+skills+cohort+deadline+geography+evidence;
    if (!description) {risks.push("缺少完整岗位JD，技能与任职门槛未验证");total=Math.min(82,total)}
    if (!j.title && !(j.positions||[]).length) {risks.push("只有招聘项目，没有具体岗位名称");total=Math.min(68,total)}
    if (j.cohort && cohort===0) {risks.push("招聘届别可能不符合2027届");total=Math.min(45,total)}
    if (avoid) risks.push("职位偏技术/现场执行，与你的方向偏好不一致");
    risks.push("招聘状态、专业限制及毕业资格仍需核对官方JD");
    const reasons=[jobMatch?"与地产、金融、项目管理或咨询职业方向较相关":maybe?"与管理、运营或数字化方向有一定关联":"岗位与目标方向的直接联系尚不明确"];
    if (description) reasons.push("已参考你补充的岗位JD进行关键词评分");
    const parts=[["职业方向",direction,30],["经历技能",skills,25],["招聘届别",cohort,20],["截止时间",deadline,10],["城市",geography,10],["信息证据",evidence,5]];
    return {score:Math.max(0,Math.min(100,Math.round(total))),reason:reasons,risk:risks,parts:parts,confidence:description?"中（JD仍需核实）":"低（缺少完整JD）"};
  }

  // Overwrite the original heuristic with a more transparent and conservative rule score.
  score=evaluate;
  function asText(x) {return String(x==null?"":x)}
  function buildPrompt(j,jd) {
    return [
      "请用中文对以下招聘岗位进行严谨的求职匹配分析。不得编造职位职责、薪酬、企业招聘状态或求职者技能；明确区分已知事实、合理推断和未知信息。",
      "求职者能力摘要（不含个人隐私）：本科工程管理，辅修金融；香港城市大学建造管理硕士，Digital Construction Management 方向。曾接触成本控制与BIM、项目协调、报告撰写和组织管理，有金融基础；财务建模、编程和投资估值熟练度尚未确认。求职优先香港和深圳，其次大湾区；主要考虑实习、2027校招、管培、项目管理/咨询、房地产投资运营、数字化管理、商业分析和基建金融；不喜欢长期驻工地或纯传统土木技术岗位。",
      "公司："+asText(j.company),
      "岗位："+asText(j.title||j.program||(j.positions||[]).join(" / ")||"未明确"),
      "地点："+asText((j.locations||[]).join(" / ")||"未知"),
      "届别："+asText(j.cohort||"未知"),
      "招聘类型："+asText(j.batch||"未知"),
      "原始申请链接："+asText(j.apply_url||"未提供"),
      "完整JD："+(jd.trim()||"未提供：只可给岗位线索初筛，不能核实专业要求、技能门槛或开放状态。"),
      "输出：1.录用资格/硬性门槛核验清单；2.职责和个人背景匹配；3.适合投递的理由和风险；4.需要补充的信息；5.有依据的匹配分0-100及信心等级；6.是否建议优先投递；7.针对简历的真实、可验证改进建议。"
    ].join("\n\n");
  }

  function showReview(article,j) {
    const evaluation=evaluate(j);
    const details=document.createElement("details");
    details.className="job-review";
    const summ=document.createElement("summary");
    summ.textContent="查看6项评分依据 · 补充JD · ChatGPT深度分析";
    details.appendChild(summ);
    const div=document.createElement("div");
    const part=document.createElement("div");part.className="components";
    evaluation.parts.forEach(function(p){
      const item=document.createElement("div");item.className="component";
      const small=document.createElement("small");small.textContent=p[0];
      const big=document.createElement("b");big.textContent=p[1]+" / "+p[2];
      item.appendChild(small);item.appendChild(big);part.appendChild(item);
    });
    div.appendChild(part);
    const reason=document.createElement("p");reason.className="note";reason.textContent="评分可信度："+evaluation.confidence+"。"+evaluation.reason.join("；")+"。缺少完整JD或招聘届别不符时，综合分数会额外下调。";div.appendChild(reason);
    const risk=document.createElement("p");risk.className="note warn";risk.textContent="需核实："+evaluation.risk.join("；");div.appendChild(risk);
    const label=document.createElement("label");label.textContent="补充职位完整JD（仅保存在当前浏览器）";div.appendChild(label);
    const area=document.createElement("textarea");area.maxLength=6000;area.placeholder="粘贴岗位职责、学历/专业要求、实习安排等。切勿粘贴联系方式或个人敏感信息。";area.value=local.jd[j.id]||j.description||"";div.appendChild(area);
    const buttons=document.createElement("div");buttons.className="buttons";
    const saveJd=document.createElement("button");saveJd.textContent="保存JD并重新评分";saveJd.type="button";
    saveJd.addEventListener("click",function(){local.jd[j.id]=area.value.slice(0,6000);save();render();alert("岗位JD已保存在本浏览器，并重新评分。")});
    const copy=document.createElement("button");copy.textContent="复制ChatGPT分析提示词";copy.type="button";
    copy.addEventListener("click",async function(){
      const promptText=buildPrompt(j,area.value);
      try {
        if(navigator.clipboard&&window.isSecureContext) await navigator.clipboard.writeText(promptText);
        else { const tmp=document.createElement("textarea");tmp.value=promptText;document.body.appendChild(tmp);tmp.select();if(!document.execCommand("copy"))throw Error("copy failed");tmp.remove(); }
        alert("已复制。打开ChatGPT并粘贴，即可获得真正的大模型评估。");
      } catch(e){window.prompt("请手动复制下方分析内容：",promptText);}
    });
    const link=document.createElement("a");link.className="btn";link.href="https://chatgpt.com/";link.target="_blank";link.rel="noopener noreferrer";link.textContent="打开ChatGPT ↗";
    buttons.appendChild(saveJd);buttons.appendChild(copy);buttons.appendChild(link);div.appendChild(buttons);
    const note=document.createElement("p");note.className="note";note.textContent="网页自动分数仍是规则初筛，不是大模型评分；复制提示词后可由ChatGPT结合完整JD进行深度判断。";div.appendChild(note);
    details.appendChild(div);article.querySelector("div:last-child").appendChild(details);
  }

  const originalRender=render;
  render=function(){
    originalRender();
    const jobs=all.slice();
    local.manual.forEach(function(j,i){jobs.push(normalise(j,i,"手动添加"))});
    const byId=new Map(jobs.map(j=>[j.id,j]));
    document.querySelectorAll("#list article.job").forEach(function(card){
      const select=card.querySelector("select.status");
      if (!select) return;
      const id=decodeURIComponent(select.dataset.id);
      const job=byId.get(id);if(job)showReview(card,job);
    });
  };

  const form=document.getElementById("add-form");
  if(form) {
    const textarea=document.createElement("textarea");
    textarea.id="new-description";textarea.placeholder="可选：粘贴完整职位描述（JD），用于更准确的筛选";textarea.maxLength=6000;
    const button=form.querySelector('button[type="submit"]');
    if(button)form.insertBefore(textarea,button);else form.appendChild(textarea);
    form.addEventListener("submit",function(){
      const previous=local.manual.length;
      const jd=textarea.value.slice(0,6000);
      queueMicrotask(function(){
        if(local.manual.length>previous) {
          local.manual[local.manual.length-1].description=jd;
          save();render();
        }
      });
    },true);
  }
  render();
})();