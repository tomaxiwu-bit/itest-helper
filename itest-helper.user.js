// ==UserScript==
// @name         iTest Helper (通用版)
// @namespace    http://itestcloud.unipus.cn/
// @version      1.0.0
// @description  iTest 答案导入通用模板 - 自行粘贴答案使用
// @match        *://itestcloud.unipus.cn/itest-api/itest/s/answer/index*
// @match        *://*.unipus.cn/*itest*
// @icon         https://www.unipus.cn/favicon.ico
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    "use strict";

    var VAL = {A:0, B:1, C:2, D:3};

    function getQuestions() {
        var qs = [];
        document.querySelectorAll("div.itest-ques[qid]").forEach(function(el) {
            var qid = el.getAttribute("qid");
            var radios = el.querySelectorAll('input[type="radio"]');
            if (radios.length) { qs.push({qid:qid, radios:radios}); return; }
            var ta = el.querySelector("textarea");
            if (ta) qs.push({qid:qid, textarea:ta});
        });
        return qs;
    }

    function fillAnswers(answers) {
        var qs = getQuestions();
        var filled = 0, errors = [];
        for (var i = 0; i < qs.length && i < answers.length; i++) {
            var ans = String(answers[i]).toUpperCase();
            var q = qs[i];
            if (q.radios) {
                var val = VAL[ans];
                if (val === undefined) { errors.push("#"+(i+1)+"["+ans+"]"); continue; }
                var target = null;
                for (var j = 0; j < q.radios.length; j++) {
                    if (q.radios[j].value == val) { target = q.radios[j]; break; }
                }
                if (target) {
                    if (!target.checked) { target.click(); target.dispatchEvent(new Event("change",{bubbles:true})); }
                    flash(target); filled++;
                }
            } else if (q.textarea) {
                q.textarea.value = ans;
                q.textarea.dispatchEvent(new Event("input",{bubbles:true}));
                q.textarea.dispatchEvent(new Event("change",{bubbles:true}));
                flash(q.textarea); filled++;
            }
        }
        if (qs.length !== answers.length) errors.push("P"+qs.length+" vs A"+answers.length);
        return {filled:filled,total:Math.min(qs.length,answers.length),errors:errors};
    }

    function flash(el) {
        var p = el.closest(".itest-ques,.itest-ques-set")||el.parentElement;
        if (p) { p.style.background="#e6f7ff";p.style.transition="all .5s";setTimeout(function(){p.style.background="transparent"},1000); }
    }

    function goNext() {
        var b = document.querySelector("#footer .goto a,.next-page");
        if (b) { b.click(); return true; }
        return false;
    }

    GM_addStyle("#hp{position:fixed;top:10px;right:10px;z-index:999999;width:400px;background:#fff;border:2px solid #4A90D9;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.2);font-family:\"Microsoft YaHei\",\"PingFang SC\",sans-serif;font-size:13px;color:#333;}" +
        "#hp .hdr{background:linear-gradient(135deg,#4A90D9,#357ABD);color:#fff;padding:10px 15px;border-radius:10px 10px 0 0;cursor:move;font-weight:bold;display:flex;justify-content:space-between;user-select:none;}" +
        "#hp .bd{padding:12px;}" +
        "#hp textarea{width:100%;height:150px;border:1px solid #ddd;border-radius:6px;padding:8px;font-size:12px;font-family:Consolas,monospace;box-sizing:border-box;resize:vertical;}" +
        "#hp textarea:focus{border-color:#4A90D9;outline:none;}" +
        "#hp .btn{flex:1;padding:8px;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;}" +
        "#hp .btn-pri{background:#4A90D9;color:#fff;}#hp .btn-suc{background:#52c41a;color:#fff;}#hp .btn-warn{background:#faad14;color:#fff;}" +
        "#hp .log{margin-top:8px;padding:6px 10px;background:#f6f8fa;border-radius:6px;font-size:12px;color:#333;max-height:180px;overflow-y:auto;font-family:Consolas,monospace;font-size:11px;}" +
        "#hp .hint{font-size:11px;color:#999;margin:4px 0;line-height:1.6;}");

    function build() {
        if (document.getElementById("hp")) return;
        var saved = ""; try { saved = GM_getValue("my_answers",""); } catch(e) {}
        var p = document.createElement("div"); p.id = "hp";
        p.innerHTML = '<div class="hdr"><span>iTest Helper</span><span id="cx" style="cursor:pointer;font-size:18px;">&times;</span></div>' +
            '<div class="bd">' +
            '<textarea id="ai" placeholder='粘贴答案... ["A","B","C"]'>'+saved.replace(/</g,"&lt;")+'</textarea>' +
            '<div class="hint">格式: <b>["A","B","C","D",...]</b> 按题目顺序<br>映射: A=选项1, B=选项2, C=选项3, D=选项4</div>' +
            '<div style="display:flex;gap:6px;margin-bottom:6px;">' +
            '<button class="btn btn-pri" id="sc">扫描题目</button>' +
            '<button class="btn btn-warn" id="sv">保存答案</button></div>' +
            '<div style="display:flex;gap:6px;">' +
            '<button class="btn btn-suc" id="ff" style="flex:2;">填写当前页</button>' +
            '<button class="btn btn-pri" id="fa" style="flex:1;">全部</button></div>' +
            '<div class="log" id="lg">就绪</div></div>';
        document.body.appendChild(p);

        var h=p.querySelector(".hdr"),dr=false,sx,sy,ox,oy;
        h.addEventListener("mousedown",function(e){if(e.target.closest("#cx"))return;dr=true;sx=e.clientX;sy=e.clientY;ox=p.offsetLeft;oy=p.offsetTop;
            var m=function(ev){if(!dr)return;p.style.left=(ox+ev.clientX-sx)+"px";p.style.top=(oy+ev.clientY-sy)+"px";p.style.right="auto";};
            var u=function(){dr=false;document.removeEventListener("mousemove",m);document.removeEventListener("mouseup",u);};
            document.addEventListener("mousemove",m);document.addEventListener("mouseup",u);});
        document.getElementById("cx").onclick=function(){p.style.display=p.style.display==="none"?"block":"none";};

        function getA() {
            var v=document.getElementById("ai").value.trim();
            if(!v){lg("请先粘贴答案");return null;}
            try{var d=JSON.parse(v);if(Array.isArray(d))return d;if(d.answers&&Array.isArray(d.answers))return d.answers;lg("格式错误");return null;}
            catch(e){lg("JSON错误: "+e.message);return null;}
        }
        function lg(m,t){var b=document.getElementById("lg");if(!b)return;var d=document.createElement("div");d.textContent=m;d.style.cssText="padding:2px 0;border-bottom:1px solid #eee;color:"+(t==="ok"?"#52c41a":t==="error"?"#ff4d4f":"#4A90D9");b.appendChild(d);b.scrollTop=b.scrollHeight;}

        document.getElementById("sc").onclick=function(){var q=getQuestions();lg("扫描: "+q.length+" 题");};
        document.getElementById("sv").onclick=function(){var a=getA();if(!a)return;try{GM_setValue("my_answers",document.getElementById("ai").value);}catch(e){}lg("已保存 "+a.length+" 条","ok");};
        document.getElementById("ff").onclick=function(){var a=getA();if(!a)return;var r=fillAnswers(a);lg("填写: "+r.filled+"/"+r.total+(r.errors.length?" WARN":" OK"),r.errors.length?"info":"ok");r.errors.slice(0,5).forEach(function(e){lg("! "+e,"error");});};
        document.getElementById("fa").onclick=async function(){var a=getA();if(!a)return;var b=this;b.disabled=true;b.textContent="...";var t=0,p=0,mp=200;try{mp=GM_getValue("itest_maxPages",200)||200;}catch(e){}while(p<mp){p++;var r=fillAnswers(a);t+=r.filled;lg("P"+p+": "+r.filled);if(!goNext()){lg("完成 "+p+"p "+t+"q","ok");b.disabled=false;b.textContent="全部";return;}await new Promise(function(r2){setTimeout(r2,2500);});}b.disabled=false;b.textContent="全部";};
    }

    if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",function(){setTimeout(build,800)});
    else setTimeout(build,800);
})();
