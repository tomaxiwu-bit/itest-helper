// ==UserScript==
// @name         iTest Helper (通用版)
// @namespace    http://itestcloud.unipus.cn/
// @version      1.0.1
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

    function fillAnswers(answers, offset) {
        offset = offset || 0;
        var qs = getQuestions();
        var filled = 0, errors = [];
        if (!qs.length) errors.push("当前页没有可识别题目");
        if (answers.length - offset < qs.length) errors.push("剩余答案不足，当前页未填写");
        if (errors.length) return {filled:0,total:qs.length,errors:errors};
        for (var i = 0; i < qs.length; i++) {
            var ans = String(answers[offset + i]);
            var q = qs[i];
            if (q.radios) {
                var val = VAL[ans.trim().toUpperCase()];
                if (val === undefined) { errors.push("#"+(i+1)+"["+ans+"]"); continue; }
                var target = null;
                for (var j = 0; j < q.radios.length; j++) {
                    if (q.radios[j].value == val) { target = q.radios[j]; break; }
                }
                if (target) {
                    if (!target.checked) { target.click(); target.dispatchEvent(new Event("change",{bubbles:true})); }
                    flash(target); filled++;
                } else errors.push("#"+(offset+i+1)+" 找不到对应选项");
            } else if (q.textarea) {
                q.textarea.value = ans;
                q.textarea.dispatchEvent(new Event("input",{bubbles:true}));
                q.textarea.dispatchEvent(new Event("change",{bubbles:true}));
                flash(q.textarea); filled++;
            }
        }
        return {filled:filled,total:qs.length,errors:errors};
    }

    function flash(el) {
        var p = el.closest(".itest-ques,.itest-ques-set")||el.parentElement;
        if (p) { p.style.background="#e6f7ff";p.style.transition="all .5s";setTimeout(function(){p.style.background="transparent"},1000); }
    }

    function goNext() {
        var b = document.querySelector("#footer .goto a,.next-page");
        if (b && !b.disabled && b.getAttribute("aria-disabled") !== "true" &&
            !b.closest(".disabled,[disabled]") && !/提交|交卷|结束/.test(b.textContent || "")) {
            b.click(); return true;
        }
        return false;
    }

    function pageSignature() {
        return getQuestions().map(function(q) { return q.qid; }).join("|");
    }

    async function waitForPageChange(previous, timeout) {
        var deadline = Date.now() + (timeout || 10000);
        while (Date.now() < deadline) {
            var current = pageSignature();
            if (current && current !== previous) return;
            await new Promise(function(resolve) { setTimeout(resolve, 100); });
        }
        throw new Error("翻页未完成，已停止；请检查页面后重试");
    }

    async function fillAll(answers, log) {
        var offset = 0, seen = new Set(), maxPages = 200;
        try { maxPages = Number(GM_getValue("itest_maxPages", 200)) || 200; } catch(e) {}
        for (var page = 1; page <= maxPages; page++) {
            var signature = pageSignature();
            if (seen.has(signature)) throw new Error("检测到重复页面，已停止");
            seen.add(signature);
            var result = fillAnswers(answers, offset);
            log("P"+page+": "+result.filled+"/"+result.total);
            if (result.errors.length) throw new Error(result.errors.join("；"));
            offset += result.total;
            if (offset === answers.length) {
                log("已填完提供的 "+offset+" 条答案，请核对是否还有下一页", "ok");
                return;
            }
            if (!goNext()) {
                log("已到末页，仍有 "+(answers.length-offset)+" 条答案未使用，请核对", "error");
                return;
            }
            await waitForPageChange(signature);
        }
        throw new Error("已到翻页上限，仍有答案未填写");
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
            '<textarea id="ai" placeholder="粘贴 JSON 答案数组"></textarea>' +
            '<div class="hint">格式: <b>["A","B","C","D",...]</b> 按题目顺序<br>全部填写请从第一页开始；只填写已有答案，不自动交卷。</div>' +
            '<div style="display:flex;gap:6px;margin-bottom:6px;">' +
            '<button class="btn btn-pri" id="sc">扫描题目</button>' +
            '<button class="btn btn-warn" id="sv">保存答案</button></div>' +
            '<div style="display:flex;gap:6px;">' +
            '<button class="btn btn-suc" id="ff" style="flex:2;">填写当前页</button>' +
            '<button class="btn btn-pri" id="fa" style="flex:1;">全部</button></div>' +
            '<div class="log" id="lg">就绪</div></div>';
        document.body.appendChild(p);
        p.querySelector("#ai").value = typeof saved === "string" ? saved : "";

        var h=p.querySelector(".hdr"),dr=false,sx,sy,ox,oy;
        h.addEventListener("mousedown",function(e){if(e.target.closest("#cx"))return;dr=true;sx=e.clientX;sy=e.clientY;ox=p.offsetLeft;oy=p.offsetTop;
            var m=function(ev){if(!dr)return;p.style.left=(ox+ev.clientX-sx)+"px";p.style.top=(oy+ev.clientY-sy)+"px";p.style.right="auto";};
            var u=function(){dr=false;document.removeEventListener("mousemove",m);document.removeEventListener("mouseup",u);};
            document.addEventListener("mousemove",m);document.addEventListener("mouseup",u);});
        document.getElementById("cx").onclick=function(){p.style.display=p.style.display==="none"?"block":"none";};

        function getA() {
            var v=document.getElementById("ai").value.trim();
            if(!v){lg("请先粘贴答案");return null;}
            try{var d=JSON.parse(v);var a=Array.isArray(d)?d:(d&&d.answers);if(Array.isArray(a)&&a.length&&a.every(function(x){return typeof x==="string"||typeof x==="number";}))return a;lg("格式错误：请提供非空的文本或数字答案数组");return null;}
            catch(e){lg("JSON错误: "+e.message);return null;}
        }
        function lg(m,t){var b=document.getElementById("lg");if(!b)return;var d=document.createElement("div");d.textContent=m;d.style.cssText="padding:2px 0;border-bottom:1px solid #eee;color:"+(t==="ok"?"#52c41a":t==="error"?"#ff4d4f":"#4A90D9");b.appendChild(d);b.scrollTop=b.scrollHeight;}

        document.getElementById("sc").onclick=function(){var q=getQuestions();lg("扫描: "+q.length+" 题");};
        document.getElementById("sv").onclick=function(){var a=getA();if(!a)return;try{GM_setValue("my_answers",document.getElementById("ai").value);}catch(e){}lg("已保存 "+a.length+" 条","ok");};
        document.getElementById("ff").onclick=function(){var a=getA();if(!a)return;var r=fillAnswers(a);lg("填写: "+r.filled+"/"+r.total+(r.errors.length?" WARN":" OK"),r.errors.length?"info":"ok");r.errors.slice(0,5).forEach(function(e){lg("! "+e,"error");});};
        document.getElementById("fa").onclick=async function(){var a=getA();if(!a)return;var b=this;b.disabled=true;b.textContent="...";try{await fillAll(a,lg);}catch(e){lg(e.message,"error");}finally{b.disabled=false;b.textContent="全部";}};
    }

    if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",function(){setTimeout(build,800)});
    else setTimeout(build,800);
})();
