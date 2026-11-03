const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");
const start = h.indexOf("      function buildDayCell(dateKey, jsWd, dayNum, isToday) {");
const end = h.indexOf("      const headCells = WD_JS.map", start);
if (start < 0 || end < 0) {
  console.error("not found", start, end);
  process.exit(1);
}
const fnOLD = `      function fmtCellTimes(tplObj) {
        if (!tplObj?.startTime) return "";
        return tplObj.endTime ? tplObj.startTime + "<br>" + tplObj.endTime : tplObj.startTime;
      }
      function buildDayCell(dateKey, jsWd, dayNum, isToday) {
        const rec = normalizeRec((DB.records[w.id]||{})[dateKey]);
        const isLeave = !!rec.leaveType;
        const isOff = wo.includes(jsWd);
        const tpl = typeof getEffectiveShiftTemplate==="function" ? getEffectiveShiftTemplate(dateKey, w.id) : null;
        const assignedTpl = tpl && tpl.startTime ? tpl : null;
        const planHrRow = (settings.shiftPlanHourlyRates||[]).find(r => r.date===dateKey && r.userId===w.id);
        const isPubHol = isTurkeyPublicHolidayDateKey(dateKey);
        const hasWork = rec.shifts.some(s => s.start);
        const isRecurringTpl = tpl && (tpl.type === "weekly" || tpl.type === "monthly" || tpl.type === "weekplan");
        const timesFromRec = rec.shifts.filter(s => s.start).map(s => s.start + (s.end ? "–" + s.end : "")).join("<br>");
        const timesFromTpl = assignedTpl ? fmtCellTimes(assignedTpl) : "";

        let bg, border, subLines;
        if (isLeave) {
          const lt = resolveLeaveType(rec.leaveType, rec);
          const c = lt?.color || "#f472b6";
          bg = c + "22";
          border = c + "88";
          subLines = '<motion.div style="font-size:10px;font-weight:800;color:' + c + ';">' + (lt?.label || "İzin").replace(/</g,"") + "</div>";
        } else if (isPubHol) {
          bg = "rgba(56, 189, 248, 0.22)";
          border = "rgba(56, 189, 248, 0.55)";
          subLines = '<div style="font-size:9px;font-weight:800;color:#7dd3fc;">Resmi Tatil</div>';
          if (hasWork) subLines += '<div style="font-size:9px;font-weight:700;color:#e0f2fe;margin-top:3px;line-height:1.3;">' + timesFromRec + "</div>";
          else if (timesFromTpl) subLines += '<div style="font-size:9px;color:#bae6fd;margin-top:3px;line-height:1.3;">' + timesFromTpl + "</div>";
        } else if (isOff) {
          bg = "rgba(251, 146, 60, 0.18)";
          border = "rgba(251, 146, 60, 0.55)";
          subLines = '<div style="font-size:9px;font-weight:800;color:#fb923c;">Hafta Tatili</div>';
          if (hasWork) subLines += '<div style="font-size:9px;font-weight:700;color:#fed7aa;margin-top:3px;line-height:1.3;">' + timesFromRec + "</div>";
          else if (timesFromTpl) subLines += '<div style="font-size:9px;color:#fdba74;margin-top:3px;line-height:1.3;">' + timesFromTpl + "</div>";
        } else if (hasWork) {
          bg = "rgba(52, 211, 153, 0.16)";
          border = "rgba(52, 211, 153, 0.5)";
          subLines = '<div style="font-size:9px;font-weight:700;color:#4ade80;line-height:1.35;">' + timesFromRec + "</motion.div>";
        } else if (assignedTpl && isRecurringTpl) {
          bg = "rgba(196, 181, 253, 0.18)";
          border = "rgba(196, 181, 253, 0.5)";
          subLines = '<div style="font-size:9px;font-weight:700;color:#c4b5fd;line-height:1.35;">' + timesFromTpl + "</div>";
        } else if (assignedTpl) {
          bg = "rgba(52, 211, 153, 0.12)";
          border = "rgba(52, 211, 153, 0.4)";
          subLines = '<div style="font-size:9px;font-weight:700;color:#86efac;line-height:1.35;">' + timesFromTpl + "</div>";
        } else if (planHrRow) {
          bg = "rgba(167, 139, 250, 0.18)";
          border = "rgba(167, 139, 250, 0.45)";
          subLines = '<div style="font-size:9px;font-weight:800;color:#c4b5fd;">Plan Ücreti</div>';
        } else {
          bg = "rgba(148, 163, 184, 0.08)";
          border = "var(--border)";
          subLines = '<div style="font-size:9px;color:var(--text4);">—</div>';
        }
        if (planHrRow && !isLeave) {
          subLines += '<motion.div style="font-size:8px;font-weight:800;color:#c4b5fd;margin-top:2px;">' + cur + Number(planHrRow.rate).toFixed(0) + "/s</div>";
        }
        const dayColor = isToday ? "var(--accent)" : "var(--text)";
        return \`<td style="\${isToday ? "background:rgba(245,166,35,0.06);" : ""}">
          <div class="my-shift-cell" style="background:\${bg};border:2px solid \${border};">
            <div style="font-size:13px;font-weight:900;color:\${dayColor};line-height:1;">\${dayNum}</div>
            <div style="width:100%;text-align:center;">\${subLines}</div>
          </div>
        </td>\`;
      }

`;
const fn2 = `      function fmtCellTimes(tplObj) {
        if (!tplObj?.startTime) return "";
        return tplObj.endTime ? tplObj.startTime + "<br>" + tplObj.endTime : tplObj.startTime;
      }
      function buildDayCell(dateKey, jsWd, dayNum, isToday) {
        const rec = normalizeRec((DB.records[w.id]||{})[dateKey]);
        const isLeave = !!rec.leaveType;
        const isOff = wo.includes(jsWd);
        const tpl = typeof getEffectiveShiftTemplate==="function" ? getEffectiveShiftTemplate(dateKey, w.id) : null;
        const assignedTpl = tpl && tpl.startTime ? tpl : null;
        const planHrRow = (settings.shiftPlanHourlyRates||[]).find(r => r.date===dateKey && r.userId===w.id);
        const isPubHol = isTurkeyPublicHolidayDateKey(dateKey);
        const hasWork = rec.shifts.some(s => s.start);
        const isRecurringTpl = tpl && (tpl.type === "weekly" || tpl.type === "monthly" || tpl.type === "weekplan");
        const timesFromRec = rec.shifts.filter(s => s.start).map(s => \`\${s.start}\${s.end ? "–" + s.end : ""}\`).join("<br>");
        const timesFromTpl = assignedTpl ? fmtCellTimes(assignedTpl) : "";

        let bg, border, subLines;
        if (isLeave) {
          const lt = resolveLeaveType(rec.leaveType, rec);
          const c = lt?.color || "#f472b6";
          bg = c + "22";
          border = c + "88";
          subLines = \`<div style="font-size:10px;font-weight:800;color:\${c};">\${escHtml(lt?.label || "İzin")}</div>\`;
        } else if (isPubHol) {
          bg = "rgba(56, 189, 248, 0.22)";
          border = "rgba(56, 189, 248, 0.55)";
          subLines = \`<motion.div style="font-size:9px;font-weight:800;color:#7dd3fc;">Resmi Tatil</div>\`;
          if (hasWork) subLines += \`<div style="font-size:9px;font-weight:700;color:#e0f2fe;margin-top:3px;line-height:1.3;">\${timesFromRec}</div>\`;
          else if (timesFromTpl) subLines += \`<div style="font-size:9px;color:#bae6fd;margin-top:3px;line-height:1.3;">\${timesFromTpl}</div>\`;
        } else if (isOff) {
          bg = "rgba(251, 146, 60, 0.18)";
          border = "rgba(251, 146, 60, 0.55)";
          subLines = \`<div style="font-size:9px;font-weight:800;color:#fb923c;">Hafta Tatili</div>\`;
          if (hasWork) subLines += \`<div style="font-size:9px;font-weight:700;color:#fed7aa;margin-top:3px;line-height:1.3;">\${timesFromRec}</div>\`;
          else if (timesFromTpl) subLines += \`<div style="font-size:9px;color:#fdba74;margin-top:3px;line-height:1.3;">\${timesFromTpl}</div>\`;
        } else if (hasWork) {
          bg = "rgba(52, 211, 153, 0.16)";
          border = "rgba(52, 211, 153, 0.5)";
          subLines = \`<div style="font-size:9px;font-weight:700;color:#4ade80;line-height:1.35;">\${timesFromRec}</div>\`;
        } else if (assignedTpl && isRecurringTpl) {
          bg = "rgba(196, 181, 253, 0.18)";
          border = "rgba(196, 181, 253, 0.5)";
          subLines = \`<div style="font-size:9px;font-weight:700;color:#c4b5fd;line-height:1.35;">\${timesFromTpl}</div>\`;
        } else if (assignedTpl) {
          bg = "rgba(52, 211, 153, 0.12)";
          border = "rgba(52, 211, 153, 0.4)";
          subLines = \`<div style="font-size:9px;font-weight:700;color:#86efac;line-height:1.35;">\${timesFromTpl}</div>\`;
        } else if (planHrRow) {
          bg = "rgba(167, 139, 250, 0.18)";
          border = "rgba(167, 139, 250, 0.45)";
          subLines = \`<div style="font-size:9px;font-weight:800;color:#c4b5fd;">Plan Ücreti</div>\`;
        } else {
          bg = "rgba(148, 163, 184, 0.08)";
          border = "var(--border)";
          subLines = \`<div style="font-size:9px;color:var(--text4);">—</div>\`;
        }
        if (planHrRow && !isLeave) {
          subLines += \`<div style="font-size:8px;font-weight:800;color:#c4b5fd;margin-top:2px;">\${cur}\${Number(planHrRow.rate).toFixed(0)}/s</div>\`;
        }
        const dayColor = isToday ? "var(--accent)" : "var(--text)";
        return \`<td style="\${isToday ? "background:rgba(245,166,35,0.06);" : ""}">
          <div class="my-shift-cell" style="background:\${bg};border:2px solid \${border};">
            <div style="font-size:13px;font-weight:900;color:\${dayColor};line-height:1;">\${dayNum}</div>
            <div style="width:100%;text-align:center;">\${subLines}</div>
          </div>
        </td>\`;
      }

`;
let out = fn2.replace(/<motion\.div/g, "<motion.div").replace(/<\/motion\.div>/g, "</motion.div>");
out = out.replace(/<motion\.motion\.motion\.div/g, "<div").replace(/<\/motion\.motion\.motion\.div>/g, "</div>");
out = out.replace(/<motion\.motion\.div/g, "<div").replace(/<\/motion\.motion\.motion\.div>/g, "</div>");
out = out.replace(/<motion\.div/g, "<div").replace(/<\/motion\.div>/g, "</div>");
h = h.slice(0, start) + out + h.slice(end);
fs.writeFileSync(p, h);
console.log("patched buildDayCell");
