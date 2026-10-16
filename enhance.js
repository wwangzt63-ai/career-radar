(function () {
  "use strict";
  if (typeof render !== "function" || typeof score !== "function" || typeof local === "undefined") return;
  if (!local.jd || typeof local.jd !== "object") local.jd = {};
  const style = document.createElement("style");
  style.textContent = ".job-review{border:1px solid #dbe5f4;background:#f8fbff;border-radius:12px;padding:12px 14px;margin-top:14px}.job-review summary{font-size:13px}.job-review .components{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:11px 0}.job-review .component{background:#fff;border:1px solid #e2e8f0;padding:9px;border-radius:9px;font-size:12px;color:#596b81}.job-review .component b{display:block;color:#273b57;font-size:16px}.job-review .note{font-size:12px;line-height:1.8;color:#596b81}.job-review .warn{color:#805e24}.job-review textarea,#new-description{display:block;width:100%;min-height:105px;resize:vertical;padding:10px;border:1px solid #d7e0ee;border-radius:9px;color:#233752;font:inherit;font-size:13px}.job-review .buttons{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}.job-review .buttons a{display:inline-block}.manual #new-description{grid-column:1/-1}.job-review label{display:block;margin:11px 0 6px;font-size:12px;color:#53657a}@media(max-width:580px){.job-review .components{grid-template-columns:repeat(2,minmax(0,1fr))}}";
  document.head.appendChild(style);

  // Public-information, rule-based evaluation: skill transferability and career direction
  // are deliberately SEPARATE. Neither score verifies hiring eligibility.
  function evaluate(j) {
    const title = [j.title,j.program,...(j.positions||[])].join(" ").toLowerCase();
    const industry = String(j.industry||"").toLowerCase();
    const raw = String(local.jd[j.id] || j.description || "").slice(0,6000);
    // Strip markup before scanning or showing information. No third-party HTML is executed.
    const jd = raw.replace(/<[^>]*>/g," ").replace(/&[a-z0-9#]+;/gi," ").replace(/\s+/g," ").toLowerCase();
    const context = title+" "+industry;
    const location = (j.locations||[]).join(" ").toLowerCase();
    const has = (pattern, value=context) => pattern.test(value);
    const project=has(/project management|project coordinator|project assistant|项目管理|项目协调|项目专员|项目助理|program management/);
    const business=has(/business analys|商业分析|战略|strategy|management consult|管理咨询|consulting|管培|management trainee|graduate programme|graduate program/);
    const ops=has(/operations?|运营|供应链|supply chain|流程管理|process improvement/);
    const finance=has(/investment|investor|finance|financial|banking|portfolio|fund|asset management|投融资|投资|金融|财务|资产管理|基金|银行|证券/);
    const estate=has(/real estate|property|地产|房地产|不动产|建筑|建设|基建|construction|built environment|infrastructure/);
    const digital=has(/digital transform|digital project|数字化|数据分析|data analy|business intelligence|product manager|数字建造/);
    const pureTech=has(/software engineer|machine learning engineer|algorithm engineer|研发工程师|前端开发|后端开发|算法工程师|嵌入式|结构设计|施工员|测量员|土木设计/);
    const game=/\b(game development|gaming|video game|gameplay|game designer|game design|motion game|nex playground)\b|游戏开发|游戏设计|游戏运营|数字游戏/i.test(context+" "+jd.slice(0,3400));
    const estateIndustry=has(/real estate|property|地产|房地产|不动产|基建|infrastructure/,context+" "+jd.slice(0,800))&&!game;
    const financeIndustry=has(/banking|investment bank|asset management|private equity|venture capital|investment management|金融服务|资产管理/,context+" "+jd.slice(0,800))&&!game;
    let sector=game?"游戏/数字内容":estateIndustry?"房地产/基建":financeIndustry?"金融/投资":estate?"工程/建设":digital?"数字化/科技":(industry&&industry!=="interns"?"其他行业（需核实）":"行业待核实");

    // Ability: transferable organization, coordination, documents and analysis.
    let ability=42;
    if(project)ability+=29;
    else if(business)ability+=21;
    else if(ops)ability+=19;
    else if(finance)ability+=16;
    else if(digital)ability+=16;
    else if(estate)ability+=15;
    if(/track|report|document|coordinate|stakeholder|progress|milestone|风险|报告|文档|沟通|协调|跟踪|分析/.test(title+" "+jd))ability+=8;
    if(/project|工程|数字化|管理|finance|金融|bim|建造/.test(context))ability+=5;
    if(pureTech)ability=Math.min(ability,39);
    ability=Math.max(18,Math.min(88,ability));

    // Direction: sector and career relevance, not just a generic "project" keyword.
    let direction=30;
    if(estateIndustry && (finance||estate||project||business))direction=90;
    else if(financeIndustry && (finance||business||project))direction=86;
    else if((estate&&finance)||(finance&&/project finance|real estate|reits|基础设施|基建/.test(context)))direction=84;
    else if(game && project)direction=59;
    else if(game && (ops||business||digital))direction=51;
    else if(project)direction=74;
    else if(business)direction=77;
    else if(digital)direction=73;
    else if(finance)direction=72;
    else if(ops)direction=61;
    else if(estate)direction=62;
    if(pureTech)direction=Math.min(direction,24);

    const docQuality=raw.length>450?78:raw.length>90?63:38;
    const evidence=j.apply_url?Math.min(95,docQuality+7):Math.max(18,docQuality-18);
    const risks=[];
    const greenhouse=String(j.source||"").includes("Greenhouse");
    const season2027=/\b(summer|spring|fall|autumn|winter)\s+2027\b/i.test(title);
    const seasonalIntern=greenhouse && season2027 && /intern|实习/.test(title);
    const cohort=seasonalIntern?"":String(j.cohort||"");
    let eligibility="招聘资格待核实";
    if(/2026届|2025届/.test(cohort)){eligibility="来源标注非2027届，请核实";risks.push("招聘届别可能不符合你的毕业年份")}
    else if(/2027届/.test(cohort)){eligibility="来源标注2027届（尚未核实）"}
    if(seasonalIntern){
      eligibility="2027年实习季，不代表只招2027届";
      risks.push("Summer 2027是实习时间，不等于要求2027届毕业");
    }
    if(/must be currently enrolled|currently enrolled|currently pursuing|现为在读|必须在读|在校学生/i.test(jd)||seasonalIntern){
      risks.push("请确认实习期间仍满足在读学生身份要求");
      if(seasonalIntern)eligibility="实习期是否在读需核实";
    }
    if(!raw)risks.push("缺少完整岗位JD；资格与职责尚不清楚");
    if(!j.title && !(j.positions||[]).length)risks.push("仅提供招聘项目名称，不是具体岗位");
    if(!j.deadline)risks.push("未标注申请截止日期");
    else if(j.deadline < new Date().toISOString().slice(0,10))risks.push("来源标注的申请截止日期已过");
    if(game)risks.push("游戏或数字内容行业兴趣、相关经验需具体准备");
    if(pureTech)risks.push("岗位偏纯技术类，与职业方向有偏差");
    risks.push("须以企业招聘页为准核对工作许可、专业条件和岗位状态");

    const reasons=[];
    if(game && project)reasons.push("这是游戏/数字内容行业的项目管理，协调能力可迁移，但并非房地产或金融岗位");
    else if(game)reasons.push("岗位属于游戏/数字内容行业，与你的长期地产金融方向关联较弱");
    else if(estateIndustry && finance)reasons.push("涉及房地产/基建与金融投资交叉方向，与你的职业目标较接近");
    else if(estateIndustry)reasons.push("与房地产/基建业务相关，建议继续核对具体岗位职责");
    else if(financeIndustry)reasons.push("属于金融/投资相关方向，需核实具体技能与资格条件");
    else if(project)reasons.push("属于跨行业项目管理；你的组织协调能力可迁移，具体行业需进一步核实");
    else if(business)reasons.push("与管理咨询、管培或商业分析方向有关，值得检查具体职责");
    else if(digital)reasons.push("与数字化或数据分析相关，但技术门槛需另行评估");
    else if(finance)reasons.push("名称涉及金融或投资，尚需确认是否符合你的目标职能");
    else if(ops)reasons.push("偏运营管理，能力有一定迁移性，但行业方向需要判断");
    else reasons.push("从岗位名称难以判断职业方向，请先阅读完整JD");
    if(pureTech)reasons[0]="岗位较偏技术执行，不是你当前优先考虑的职业方向";
    // Overall is explicitly a screening index, not official eligibility or employability.
    let score=Math.round(ability*.45+direction*.45+evidence*.10);
    if(!j.title && !(j.positions||[]).length)score=Math.min(score,59);
    if(cohort && /2026届|2025届/.test(cohort))score=Math.min(score,42);
    if(!raw)score=Math.min(score,80);
    const confidence=raw.length>450?"中（有描述，尚待核实）":"低（信息不完整）";
    return {score,ability,direction,eligibility,sector,reason:reasons,risk:risks,
      parts:[["能力匹配",ability,100],["职业方向",direction,100],["资料参考度",evidence,100]],
      confidence};
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
    summ.textContent="查看双维评分 · 申请资格 · JD深度分析";
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
    const reason=document.createElement("p");reason.className="note";reason.textContent="行业判断："+evaluation.sector+"。申请资格："+evaluation.eligibility+"。信息可信度："+evaluation.confidence+"。"+evaluation.reason.join("；")+"。综合分是规则初筛，能力与职业方向分别计算。";div.appendChild(reason);
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
    const note=document.createElement("p");note.className="note";note.textContent="能力、职业方向及资料参考度均为启发式规则分，不代表录用概率或官方资格核验。ChatGPT 深度分析需你手动复制提示词。";div.appendChild(note);
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
      const job=byId.get(id);if(job){
        const e=evaluate(job);
        const scoreBox=card.querySelector(".score");
        if(scoreBox)scoreBox.title="综合参考分（不是录取概率）";
        const sm=scoreBox&&scoreBox.querySelector("small");if(sm)sm.textContent="综合参考分";
        const tagWrap=card.querySelector(".tags");
        if(tagWrap){for(const [label,value] of [["能力匹配",e.ability],["职业方向",e.direction]]){
          const badge=document.createElement("span");badge.className="tag";badge.textContent=label+" "+value+"/100";tagWrap.appendChild(badge);
        }}
        showReview(card,job);
      }
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