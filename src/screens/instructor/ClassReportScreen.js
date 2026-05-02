import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Alert, TextInput, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import api from '../../config/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const HEADER_STORAGE_KEY    = 'classReportHeaderFields_v3';
const MAX_SESSIONS_PER_PAGE = 30;
const MAX_STUDENTS_PER_PAGE = 25;

// ─── Convert image URI → base64 data URL ─────────────────────────────────────
const imageUriToBase64DataUrl = async (uri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    if (!base64) return null;
    const lower = uri.toLowerCase();
    let mime = 'image/jpeg';
    if (lower.includes('.png'))  mime = 'image/png';
    else if (lower.includes('.gif'))  mime = 'image/gif';
    else if (lower.includes('.webp')) mime = 'image/webp';
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.warn('imageUriToBase64DataUrl failed:', err);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Fallback base64 conversion also failed:', e);
      return null;
    }
  }
};

// ─── Filter helpers ───────────────────────────────────────────────────────────
const getDayRange = (offsetDays = 0) => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() + offsetDays);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getWeekRange = (offsetWeeks = 0) => {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day === 0 ? -6 : 1 - day) + offsetWeeks * 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon, end: sun };
};

const getMonthRange = (offsetMonths = 0) => {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59);
  return { start, end };
};

const filterStudentsByRange = (students, sessionDates, filterType, offset = 0) => {
  if (filterType === 'semester') return { students, dates: sessionDates };

  let start, end;
  if (filterType === 'daily')        ({ start, end } = getDayRange(offset));
  else if (filterType === 'weekly')  ({ start, end } = getWeekRange(offset));
  else if (filterType === 'monthly') ({ start, end } = getMonthRange(offset));
  else return { students, dates: sessionDates };

  const filteredDates = sessionDates.filter((d) => {
    const dt = new Date(`${d}T00:00:00`);
    return dt >= start && dt <= end;
  });

  const filteredStudents = students.map((student) => {
    const filteredRecords = (student.day_records || []).filter((rec) => {
      const dt = new Date(`${rec.date}T00:00:00`);
      return dt >= start && dt <= end;
    });
    const presentCount   = filteredRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
    const absentCount    = filteredRecords.filter((r) => r.status === 'absent').length;
    const totalSessions  = filteredRecords.length;
    const attendanceRate = totalSessions > 0
      ? Math.round((presentCount / totalSessions) * 1000) / 10 : 0;
    return {
      ...student,
      day_records:     filteredRecords,
      present_count:   presentCount,
      absent_count:    absentCount,
      total_sessions:  totalSessions,
      attendance_rate: attendanceRate,
    };
  });

  return { students: filteredStudents, dates: filteredDates };
};

const getRangeLabel = (filterType, offset) => {
  if (filterType === 'semester') return 'Whole Semester';
  if (filterType === 'daily') {
    const { start } = getDayRange(offset);
    return start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (filterType === 'weekly') {
    const { start, end } = getWeekRange(offset);
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(start)} - ${fmt(end)}`;
  }
  if (filterType === 'monthly') {
    const { start } = getMonthRange(offset);
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return '';
};

// ─── HTML Generator ───────────────────────────────────────────────────────────
const generateHTML = (
  report, filteredStudents, filteredDates,
  filterType, offset, headerFields, printedBy
) => {
  const rangeLabel = getRangeLabel(filterType, offset);
  const getColor   = (rate) => rate >= 90 ? '#166534' : rate >= 75 ? '#92400e' : '#991b1b';

  const sortedDates    = [...filteredDates].sort((a, b) => new Date(a) - new Date(b));
  const sortedStudents = [...filteredStudents];

  const overallPresent = sortedStudents.reduce((s, st) => s + (st.present_count || 0), 0);
  const overallTotal   = sortedStudents.reduce((s, st) => s + (st.total_sessions || 0), 0);
  const overallRate    = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 1000) / 10 : 0;
  const avgPresent     = sortedDates.length > 0 ? Math.round(overallPresent / sortedDates.length) : 0;
  const avgAbsent      = sortedDates.length > 0
    ? Math.round((overallTotal - overallPresent) / sortedDates.length) : 0;

  // Generated date (date + month + year only, no time)
  const generatedDate = new Date().toLocaleDateString('en-PH', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Chunk dates & students ──
  const dateChunks = [];
  for (let i = 0; i < sortedDates.length; i += MAX_SESSIONS_PER_PAGE)
    dateChunks.push(sortedDates.slice(i, i + MAX_SESSIONS_PER_PAGE));
  if (dateChunks.length === 0) dateChunks.push([]);

  const studentChunks = [];
  for (let i = 0; i < sortedStudents.length; i += MAX_STUDENTS_PER_PAGE)
    studentChunks.push(sortedStudents.slice(i, i + MAX_STUDENTS_PER_PAGE));
  if (studentChunks.length === 0) studentChunks.push([]);

  const totalPages = dateChunks.length * studentChunks.length;

  // ── Logo HTML ──
  const placeholderStyle = 'width:56px;height:56px;border-radius:50%;border:1.5px solid #999;display:inline-flex;align-items:center;justify-content:center;font-size:8px;color:#777;text-align:center;background:#f0f0f0;flex-shrink:0;';
  const imgStyle         = 'display:inline-block;width:56px;height:56px;border-radius:50%;object-fit:cover;object-position:center;border:1.5px solid #555;flex-shrink:0;';

  const schoolLogoHTML   = headerFields.schoolLogoBase64
    ? `<img src="${headerFields.schoolLogoBase64}" width="56" height="56" style="${imgStyle}" alt="School Logo"/>`
    : `<div style="${placeholderStyle}">School<br/>Logo</div>`;
  const divisionLogoHTML = headerFields.divisionLogoBase64
    ? `<img src="${headerFields.divisionLogoBase64}" width="56" height="56" style="${imgStyle}" alt="Division Seal"/>`
    : `<div style="${placeholderStyle}">Div.<br/>Seal</div>`;

  const departmentLine = headerFields.departmentText
    || 'Republic of the Philippines &bull; Department of Education';

  const schPos = headerFields.schoolLogoPosition   || 'left';
  const divPos = headerFields.divisionLogoPosition || 'right';

  const logoLeft   = [];
  const logoRight  = [];
  const logoCenter = [];

  if (schPos === 'left')   logoLeft.push(schoolLogoHTML);
  if (schPos === 'center') logoCenter.push(schoolLogoHTML);
  if (schPos === 'right')  logoRight.push(schoolLogoHTML);

  if (divPos === 'left')   logoLeft.push(divisionLogoHTML);
  if (divPos === 'center') logoCenter.push(divisionLogoHTML);
  if (divPos === 'right')  logoRight.push(divisionLogoHTML);

  const collegeLine = headerFields.collegeDepartment
    ? `<div class="scollege">${headerFields.collegeDepartment}</div>` : '';

  const centerLogosRow = logoCenter.length
    ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:5px;">${logoCenter.join('')}</div>`
    : '';

  const leftLogoHTML  = logoLeft.length
    ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;margin-right:8px;">${logoLeft.join('')}</div>`
    : '';
  const rightLogoHTML = logoRight.length
    ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;margin-left:8px;">${logoRight.join('')}</div>`
    : '';

  // ── Plain-text summary block (replaces boxed summary) ──
  const plainSummary = `
    <div class="plain-summary">
      <span>Total Enrolled: <strong>${report?.summary?.total_enrolled ?? 0}</strong></span>
      <span class="summary-sep">|</span>
      <span>Sessions: <strong>${sortedDates.length}</strong></span>
      <span class="summary-sep">|</span>
      <span>Avg Attendance Rate: <strong style="color:${getColor(overallRate)};">${overallRate}%</strong></span>
      <span class="summary-sep">|</span>
      <span>Avg Present / Session: <strong style="color:#166534;">${avgPresent}</strong></span>
      <span class="summary-sep">|</span>
      <span>Avg Absent / Session: <strong style="color:#991b1b;">${avgAbsent}</strong></span>
    </div>
  `;

  // ── First-page header ──
  const firstPageHeader = `
    <div style="border-bottom:3px double #111;padding-bottom:10px;margin-bottom:6px;text-align:center;">
      <div style="display:inline-flex;align-items:center;justify-content:center;">
        ${leftLogoHTML}
        <div style="text-align:center;">
          ${centerLogosRow}
          <div class="dept">${departmentLine}</div>
          <div class="sname">${headerFields.schoolName || 'School Name'}</div>
          ${collegeLine}
          <div class="saddr">${headerFields.schoolAddress || 'School Address'}</div>
        </div>
        ${rightLogoHTML}
      </div>
    </div>

    <div class="title-block">
      <div class="main-title">${headerFields.reportTitle || 'Class Attendance Report'}</div>
      <div class="sub-title">Student Daily Attendance Summary</div>
    </div>

    <div class="info-grid">
      <div class="info-cell"><span class="lbl">Subject / Class</span><span class="val">${headerFields.className || ''}</span></div>
      <div class="info-cell"><span class="lbl">Class Code / Section</span><span class="val">${headerFields.classCode || ''}</span></div>
      <div class="info-cell"><span class="lbl">Teacher / Faculty</span><span class="val">${printedBy || '&mdash;'}</span></div>
      <div class="info-cell"><span class="lbl">School Year / Period</span><span class="val">${headerFields.rangeLabel || rangeLabel}</span></div>
    </div>
  `;

  // ── Continuation mini-header ──
  const continuationHeader = (pageNum) => `
    <div class="cont-header">
      <div class="cont-left">
        <div class="cont-school">${headerFields.schoolName || 'Class Attendance Report'}</div>
        <div class="cont-sub">${headerFields.className || ''} &nbsp;|&nbsp; ${headerFields.classCode || ''} &nbsp;|&nbsp; ${headerFields.rangeLabel || rangeLabel}</div>
      </div>
      <div class="cont-page">Page ${pageNum} of ${totalPages}</div>
    </div>
  `;

  // ── Signature block (last page only) ──
  const sigBlock = `
    <div class="sig-block">
      <div class="sig-col">
        <div class="sig-line"></div>
        <div class="sig-name">${printedBy || '&mdash;'}</div>
        <div class="sig-role">Subject Teacher / Prepared by</div>
        <div class="sig-date">Date: _______________</div>
      </div>
      <div class="sig-col">
        <div style="text-align:center;padding-top:10px;">
          <div class="footer-inline">This document is for official use only.</div>
          <div class="generated-date">Generated: ${generatedDate}</div>
        </div>
      </div>
      <div class="sig-col">
        <div class="sig-line"></div>
        <div class="sig-name">${headerFields.principalName || 'School Principal'}</div>
        <div class="sig-role">Noted by / School Head</div>
        <div class="sig-date">Date: _______________</div>
      </div>
    </div>
  `;

  // ── Build pages ──
  let pageNumber = 0;
  const pages    = [];

  dateChunks.forEach((datePage, dIdx) => {
    studentChunks.forEach((studentPage, sIdx) => {
      pageNumber++;
      const isFirstPage = pageNumber === 1;
      const isLastPage  = pageNumber === totalPages;

      const sessionNote = dateChunks.length > 1
        ? ` &mdash; Sessions ${dIdx * MAX_SESSIONS_PER_PAGE + 1}&ndash;${Math.min((dIdx + 1) * MAX_SESSIONS_PER_PAGE, sortedDates.length)} of ${sortedDates.length}`
        : '';
      const studentNote = studentChunks.length > 1
        ? ` &mdash; Students ${sIdx * MAX_STUDENTS_PER_PAGE + 1}&ndash;${Math.min((sIdx + 1) * MAX_STUDENTS_PER_PAGE, sortedStudents.length)}`
        : '';

      // Table header cells — white bg, black text, border
      const dateHeaders = datePage.map((d) => {
        const dt  = new Date(`${d}T00:00:00`);
        const mon = dt.toLocaleDateString('en-US', { month: 'short' });
        const day = dt.getDate();
        return `<th style="padding:3px 2px;text-align:center;font-size:7.5px;min-width:24px;border:1px solid #333;background:#fff;color:#111;">${mon}<br/>${day}</th>`;
      }).join('');

      const rows = studentPage.map((student, i) => {
        const lastName    = student.last_name  || '';
        const firstName   = student.first_name || '';
        const mi          = student.middle_initial ? ` ${student.middle_initial}.` : '';
        const displayName = `${lastName}, ${firstName}${mi}`;
        const rate        = student.attendance_rate ?? 0;
        const color       = getColor(rate);
        const statusMap   = {};
        (student.day_records || []).forEach((r) => { statusMap[r.date] = r.status; });
        const globalIndex = sIdx * MAX_STUDENTS_PER_PAGE + i + 1;

        const dateCells = datePage.map((d) => {
          const status    = statusMap[d] || 'absent';
          const isPresent = status === 'present' || status === 'late';
          return `<td style="padding:3px 1px;text-align:center;font-size:8px;font-weight:700;color:${isPresent ? '#166534' : '#991b1b'};border:0.5px solid #e5e7eb;">${isPresent ? 'P' : 'A'}</td>`;
        }).join('');

        return `
          <tr style="background:${i % 2 === 0 ? '#f7f7f7' : '#ffffff'}">
            <td style="padding:3px 4px;text-align:center;font-size:8px;color:#888;border:0.5px solid #ddd;">${globalIndex}</td>
            <td style="padding:3px 6px;font-size:8.5px;border:0.5px solid #ddd;white-space:nowrap;">
              <span style="font-weight:600;color:#111;">${displayName}</span>
              <span style="font-size:7.5px;color:#666;margin-left:4px;">${student.student_id}</span>
            </td>
            ${dateCells}
            <td style="padding:3px;text-align:center;font-weight:700;color:#166534;font-size:8.5px;border:0.5px solid #ddd;">${student.present_count}</td>
            <td style="padding:3px;text-align:center;font-weight:700;color:#991b1b;font-size:8.5px;border:0.5px solid #ddd;">${student.absent_count}</td>
            <td style="padding:3px 5px;text-align:center;font-weight:700;color:${color};font-size:8.5px;border:0.5px solid #ddd;">${rate}%</td>
          </tr>`;
      }).join('');

      pages.push(`
        <div class="page${!isLastPage ? ' page-break' : ''}">
          <div class="page-content">

          ${isFirstPage ? firstPageHeader : continuationHeader(pageNumber)}

          <table>
            <thead>
              <tr>
                <th class="th-plain" style="min-width:20px;">#</th>
                <th class="th-plain left" style="min-width:110px;">Student Name (ID)</th>
                ${dateHeaders}
                <th class="th-plain" style="min-width:36px;">Total<br/>Present</th>
                <th class="th-plain" style="min-width:36px;">Total<br/>Absent</th>
                <th class="th-plain" style="min-width:32px;text-align:center;padding-right:5px;">Rate</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length > 0
                ? rows
                : '<tr><td colspan="99" style="text-align:center;padding:16px;color:#aaa;">No records for this period.</td></tr>'}
            </tbody>
          </table>

          ${isLastPage ? plainSummary : ''}

          <div style="margin-top:5px;font-size:7.5px;color:#555;">
            Legend: &nbsp;<strong style="color:#166534;">P</strong> = Present
            &nbsp;&nbsp;<strong style="color:#991b1b;">A</strong> = Absent
            &nbsp;&nbsp;Rate below 75% is flagged in red.
          </div>
          ${isLastPage ? `<div style="border-top:0.5px solid #aaa;margin-top:8px;"></div>` : ''}

          </div>
          ${isLastPage ? sigBlock : ''}
        </div>
      `);
    });
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
@page { size: A4 landscape; margin: 10mm 12mm; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Times New Roman',Times,serif; background:#fff; color:#111; font-size:9px; width:277mm; }

/* Each page is a flex column so sig block can be pushed to the bottom */
.page {
  width:100%;
  min-height:190mm;
  display:flex;
  flex-direction:column;
}
.page-content {
  flex:1;
}
.page-break { page-break-after:always; }

.dept    { font-size:8px; letter-spacing:0.5px; color:#444; }
.sname   { font-size:14px; font-weight:bold; margin:3px 0; }
.scollege{ font-size:9px; font-weight:600; color:#333; margin:1px 0; }
.saddr   { font-size:8px; color:#555; }

.title-block { text-align:center; margin:8px 0 6px; }
.main-title  { font-size:14px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase; }
.sub-title   { font-size:9px; color:#444; }
.info-grid   { display:grid; grid-template-columns:1fr 1fr; border:0.5px solid #888; margin-bottom:8px; }
.info-cell   { padding:3px 8px; border-right:0.5px solid #aaa; border-bottom:0.5px solid #aaa; font-size:8.5px; }
.info-cell:nth-child(even) { border-right:none; }
.lbl { display:block; font-size:7.5px; color:#666; text-transform:uppercase; letter-spacing:0.3px; }
.val { font-weight:bold; color:#111; }

/* ── Plain-text summary (replaces boxed summary) ── */
.plain-summary {
  display:flex; flex-wrap:wrap; gap:4px 10px; align-items:center;
  margin:10px 0 4px; font-size:8px; color:#333;
}
.summary-sep { color:#aaa; }

/* ── Table ── */
table { width:100%; border-collapse:collapse; }
/* Default th for date columns (set inline) */
/* Plain white header cells for fixed columns */
.th-plain {
  background:#fff; color:#111; padding:4px 3px;
  font-size:7.5px; font-weight:bold; text-align:center; border:1px solid #333;
}
.th-plain.left { text-align:left; padding-left:6px; }

/* ── Continuation header ── */
.cont-header {
  display:flex; align-items:center; justify-content:space-between;
  border-bottom:1.5px solid #1a1a2e; padding-bottom:6px; margin-bottom:6px;
}
.cont-school  { font-size:11px; font-weight:bold; color:#1a1a2e; }
.cont-sub     { font-size:8px; color:#555; margin-top:2px; }
.cont-page    { font-size:8px; color:#666; font-style:italic; }

/* ── Signature & footer — always at bottom of last page ── */
.sig-block {
  display:flex; justify-content:space-between; align-items:flex-end;
  margin-top:auto; padding-top:14px; font-size:8px;
}
.sig-col   { text-align:center; flex:1; }
.sig-line  { width:130px; border-bottom:0.5px solid #111; margin:28px auto 4px; }
.sig-name  { font-weight:bold; font-size:9px; }
.sig-role  { font-size:7.5px; color:#555; }
.sig-date  { font-size:7.5px; color:#555; margin-top:2px; }
.footer-inline {
  font-size:7.5px; color:#666; margin-bottom:4px;
}
.generated-date {
  font-size:8px; color:#555; font-style:italic;
}

@media print {
  body { width:277mm; }
  .page-break { page-break-after:always; }
}
</style>
</head>
<body>
  ${pages.join('\n')}
</body>
</html>`;
};

// ─── Default header state ─────────────────────────────────────────────────────
const DEFAULT_HEADER = {
  reportTitle:          'Class Attendance Report',
  className:            '',
  classCode:            '',
  rangeLabel:           '',
  schoolName:           '',
  schoolAddress:        '',
  collegeDepartment:    '',
  principalName:        '',
  departmentText:       'Republic of the Philippines \u2022 Department of Education',
  schoolLogoUri:        null,
  divisionLogoUri:      null,
  schoolLogoBase64:     null,
  divisionLogoBase64:   null,
  schoolLogoPosition:   'left',
  divisionLogoPosition: 'right',
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ClassReportScreen({ route, navigation }) {
  const { classData } = route.params;

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport]         = useState(null);
  const [printedBy, setPrintedBy]   = useState('');

  const [headerFields, setHeaderFields]           = useState(DEFAULT_HEADER);
  const [editHeaderVisible, setEditHeaderVisible] = useState(false);
  const [tempHeader, setTempHeader]               = useState({ ...DEFAULT_HEADER });

  // ── Filter: daily | weekly | monthly  (no semester)
  const [filterType, setFilterType]                 = useState('daily');
  const [offset, setOffset]                         = useState(0);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting]                   = useState(false);
  const [logoLoading, setLogoLoading]               = useState({ school: false, division: false });

  // ── Load persisted header ──
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HEADER_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setHeaderFields((prev) => ({
            ...DEFAULT_HEADER,
            ...prev,
            ...saved,
            schoolLogoUri:   saved.schoolLogoBase64   || null,
            divisionLogoUri: saved.divisionLogoBase64 || null,
          }));
        }
      } catch (e) { console.warn('loadHeader error:', e); }
    })();
  }, []);

  // ── Load user name ──
  useEffect(() => {
    AsyncStorage.getItem('userData').then((raw) => {
      if (!raw) return;
      const user = JSON.parse(raw);
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ')
        || user.name || user.username || 'Unknown';
      setPrintedBy(name);
    }).catch(() => {});
  }, []);

  // ── Fetch report ──
  const fetchReport = async () => {
    try {
      const token    = await AsyncStorage.getItem('authToken');
      const response = await api.get(
        `/reports/class_report.php?class_id=${classData.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setReport(response.data);
        setHeaderFields((prev) => ({
          ...prev,
          className: prev.className || classData.class_name || '',
          classCode: prev.classCode || (classData.class_code
            ? `${classData.class_code}${classData.section ? ' - ' + classData.section : ''}`
            : ''),
        }));
      }
    } catch (error) {
      console.error('Report fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);
  useEffect(() => { setOffset(0); }, [filterType]);

  const onRefresh = () => { setRefreshing(true); fetchReport(); };

  const getAttendanceColor = (rate) => {
    if (rate >= 90) return COLORS.success;
    if (rate >= 75) return COLORS.warning;
    return COLORS.error;
  };

  const sessionDates = report?.session_dates || report?.summary?.session_dates || [];
  const { students: filteredStudents, dates: filteredDates } = report?.students
    ? filterStudentsByRange(report.students, sessionDates, filterType, offset)
    : { students: [], dates: [] };

  const sortedFilteredDates = [...filteredDates].sort((a, b) => new Date(a) - new Date(b));
  const totalPresent  = filteredStudents.reduce((s, st) => s + (st.present_count || 0), 0);
  const totalSessions = filteredStudents.reduce((s, st) => s + (st.total_sessions || 0), 0);
  const avgRate       = totalSessions > 0
    ? Math.round((totalPresent / totalSessions) * 1000) / 10 : 0;

  const totalPdfPages =
    Math.max(1, Math.ceil(sortedFilteredDates.length / MAX_SESSIONS_PER_PAGE)) *
    Math.max(1, Math.ceil(filteredStudents.length  / MAX_STUDENTS_PER_PAGE));

  // ── Header modal ──
  const openEditHeader = () => { setTempHeader({ ...headerFields }); setEditHeaderVisible(true); };
  const saveHeader = async () => {
    const toApply = { ...tempHeader };
    setHeaderFields(toApply);
    setEditHeaderVisible(false);
    const { schoolLogoUri, divisionLogoUri, ...toPersist } = toApply;
    try { await AsyncStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(toPersist)); }
    catch (e) { console.warn('saveHeader persist error:', e); }
  };

  // ── Logo picker ──
  const pickLogo = async (logoKey) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;
    const uri = result.assets[0].uri;
    setLogoLoading((prev) => ({ ...prev, [logoKey]: true }));
    try {
      const base64DataUrl = await imageUriToBase64DataUrl(uri);
      if (!base64DataUrl) {
        Alert.alert('Error', 'Could not read this image. Please try a different file.');
        return;
      }
      if (logoKey === 'school') {
        setTempHeader((prev) => ({ ...prev, schoolLogoUri: uri, schoolLogoBase64: base64DataUrl }));
      } else {
        setTempHeader((prev) => ({ ...prev, divisionLogoUri: uri, divisionLogoBase64: base64DataUrl }));
      }
    } finally {
      setLogoLoading((prev) => ({ ...prev, [logoKey]: false }));
    }
  };

  const removeLogo = (logoKey) => {
    if (logoKey === 'school') {
      setTempHeader((prev) => ({ ...prev, schoolLogoUri: null, schoolLogoBase64: null }));
    } else {
      setTempHeader((prev) => ({ ...prev, divisionLogoUri: null, divisionLogoBase64: null }));
    }
  };

  // ── Logo Picker Row ──
  const LogoPickerRow = ({ label, logoKey, uri, base64 }) => {
    const isLoading     = logoLoading[logoKey];
    const displaySource = uri || base64 || null;
    const posKey        = logoKey === 'school' ? 'schoolLogoPosition' : 'divisionLogoPosition';
    const currentPos    = tempHeader[posKey] || (logoKey === 'school' ? 'left' : 'right');

    const positions = [
      { value: 'left',   icon: 'arrow-back-outline',   label: 'Left'   },
      { value: 'center', icon: 'resize-outline',        label: 'Center' },
      { value: 'right',  icon: 'arrow-forward-outline', label: 'Right'  },
    ];

    return (
      <View>
        <Text style={styles.logoLabel}>{label}</Text>
        <View style={styles.logoRow}>
          {displaySource
            ? <Image source={{ uri: displaySource }} style={styles.logoPreview} resizeMode="cover" />
            : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="image-outline" size={24} color={COLORS.textSecondary} />
                <Text style={styles.logoPlaceholderText}>No logo</Text>
              </View>
            )}
          <View style={styles.logoBtns}>
            <TouchableOpacity
              style={[styles.logoUploadBtn, isLoading && styles.logoBtnDisabled]}
              onPress={() => pickLogo(logoKey)}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator size="small" color={COLORS.white} style={{ marginRight: 4 }} />
                : <Ionicons name="cloud-upload-outline" size={15} color={COLORS.white} />}
              <Text style={styles.logoUploadBtnText}>
                {isLoading ? 'Processing...' : displaySource ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>
            {displaySource && !isLoading && (
              <TouchableOpacity style={styles.logoRemoveBtn} onPress={() => removeLogo(logoKey)}>
                <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                <Text style={styles.logoRemoveBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.posRow}>
          <Text style={styles.posRowLabel}>Position</Text>
          <View style={styles.posToggleGroup}>
            {positions.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[styles.posToggleBtn, currentPos === p.value && styles.posToggleBtnActive]}
                onPress={() => setTempHeader((prev) => ({ ...prev, [posKey]: p.value }))}
              >
                <Ionicons
                  name={p.icon}
                  size={14}
                  color={currentPos === p.value ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[styles.posToggleBtnText, currentPos === p.value && styles.posToggleBtnTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // ── Export ──
  const exportPDF = async () => {
    setExporting(true);
    try {
      const html = generateHTML(report, filteredStudents, filteredDates, filterType, offset, headerFields, printedBy);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF Report' });
      } else {
        Alert.alert('Saved', `PDF saved to:\n${uri}`);
      }
    } catch (err) {
      console.error('exportPDF error:', err);
      Alert.alert('Error', 'Failed to export PDF.');
    } finally {
      setExporting(false);
      setExportModalVisible(false);
    }
  };

  //─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── App Header ── */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Class Report</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={openEditHeader} disabled={loading || !report}>
              <Ionicons name="create-outline" size={21} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setExportModalVisible(true)} disabled={loading || !report}>
              <Ionicons name="download-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerClass}>{classData.class_name}</Text>
        <Text style={styles.headerCode}>
          {classData.class_code}{classData.section ? ` - ${classData.section}` : ''}
        </Text>
      </LinearGradient>

      {/* ── Filter Bar ── */}
      <View style={styles.filterBar}>
        <View style={styles.filterTabs}>
          {[
            { key: 'daily',    label: 'Daily'    },
            { key: 'weekly',   label: 'Weekly'   },
            { key: 'monthly',  label: 'Monthly'  },
            { key: 'semester', label: 'Semester' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, filterType === tab.key && styles.filterTabActive]}
              onPress={() => setFilterType(tab.key)}
            >
              <Text style={[styles.filterTabText, filterType === tab.key && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {filterType !== 'semester' && (
          <View style={styles.filterNav}>
            <TouchableOpacity style={styles.navArrow} onPress={() => setOffset((o) => o - 1)}>
              <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.navLabel} numberOfLines={1}>{getRangeLabel(filterType, offset)}</Text>
            <TouchableOpacity
              style={[styles.navArrow, offset >= 0 && styles.navArrowDisabled]}
              onPress={() => offset < 0 && setOffset((o) => o + 1)}
              disabled={offset >= 0}
            >
              <Ionicons name="chevron-forward" size={18} color={offset >= 0 ? COLORS.grayLight : COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
        {filterType === 'semester' && (
          <Text style={styles.semesterLabel}>All Sessions</Text>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Generating report...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {/* Pagination info banner */}
          {totalPdfPages > 1 && (
            <View style={styles.paginationBanner}>
              <Ionicons name="copy-outline" size={15} color={COLORS.primary} />
              <Text style={styles.paginationBannerText}>
                PDF will have <Text style={{ fontWeight: '700' }}>{totalPdfPages} pages</Text>.
                {' '}Page 1 shows full header; continuation pages show table only.
              </Text>
            </View>
          )}

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="people" size={22} color={COLORS.info} />
              <Text style={[styles.summaryNum, { color: COLORS.info }]}>{report?.summary?.total_enrolled ?? 0}</Text>
              <Text style={styles.summaryLbl}>Enrolled</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="calendar" size={22} color={COLORS.primary} />
              <Text style={[styles.summaryNum, { color: COLORS.primary }]}>{sortedFilteredDates.length}</Text>
              <Text style={styles.summaryLbl}>Sessions</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="trending-up" size={22} color={getAttendanceColor(avgRate)} />
              <Text style={[styles.summaryNum, { color: getAttendanceColor(avgRate) }]}>{avgRate}%</Text>
              <Text style={styles.summaryLbl}>Avg Rate</Text>
            </View>
          </View>

          {/* Attendance Table */}
          <View style={styles.tableCard}>
            <Text style={styles.sectionTitle}>Student Attendance Summary</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHd, { width: 28 }]}>#</Text>
                  <Text style={[styles.tableHd, styles.colStudent]}>STUDENT</Text>
                  {sortedFilteredDates.map((d) => (
                    <View key={d} style={styles.colDate}>
                      <Text style={styles.tableHdDate}>
                        {new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short' })}
                      </Text>
                      <Text style={styles.tableHdDate}>
                        {new Date(`${d}T00:00:00`).getDate()}
                      </Text>
                    </View>
                  ))}
                  <Text style={[styles.tableHd, styles.colCount]}>Total{'\n'}Present</Text>
                  <Text style={[styles.tableHd, styles.colCount]}>Total{'\n'}Absent</Text>
                  <Text style={[styles.tableHd, styles.colRate]}>RATE</Text>
                </View>

                {filteredStudents.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={40} color={COLORS.gray} />
                    <Text style={styles.emptyText}>No records for this period</Text>
                  </View>
                ) : (
                  filteredStudents.map((student, index) => {
                    const rate     = student.attendance_rate ?? 0;
                    const fullName = [student.first_name, student.middle_initial || null, student.last_name]
                      .filter(Boolean).join(' ');
                    const statusMap = {};
                    (student.day_records || []).forEach((r) => { statusMap[r.date] = r.status; });
                    return (
                      <View
                        key={student.id}
                        style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
                      >
                        <Text style={[styles.tableCell, { width: 28, color: COLORS.textSecondary, fontSize: 11 }]}>
                          {index + 1}
                        </Text>
                        <View style={styles.colStudent}>
                          <Text style={styles.studentName} numberOfLines={1}>{fullName}</Text>
                          <Text style={styles.studentId}>{student.student_id}</Text>
                        </View>
                        {sortedFilteredDates.map((d) => {
                          const status    = statusMap[d] || 'absent';
                          const isPresent = status === 'present' || status === 'late';
                          return (
                            <View key={d} style={styles.colDate}>
                              <Text style={[styles.statusLetter, { color: isPresent ? COLORS.success : COLORS.error }]}>
                                {isPresent ? 'P' : 'A'}
                              </Text>
                            </View>
                          );
                        })}
                        <Text style={[styles.colCount, styles.tableCell, { color: COLORS.success }]}>{student.present_count}</Text>
                        <Text style={[styles.colCount, styles.tableCell, { color: COLORS.error }]}>{student.absent_count}</Text>
                        <Text style={[styles.colRate, styles.tableCell, { color: getAttendanceColor(rate), fontWeight: 'bold' }]}>{rate}%</Text>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </View>

          {printedBy ? (
            <View style={styles.printedByPreview}>
              <Text style={styles.printedByLabel}>Printed by</Text>
              <View style={styles.printedByUnderline} />
              <Text style={styles.printedByName}>{printedBy}</Text>
            </View>
          ) : null}

          {/* Generated date — center, date+month+year only */}
          <Text style={styles.generatedAt}>
            Generated:{' '}
            {new Date().toLocaleDateString('en-PH', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* ══ Edit Header Modal ══ */}
      <Modal visible={editHeaderVisible} transparent animationType="slide" onRequestClose={() => setEditHeaderVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEditHeaderVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Report Header</Text>
            <Text style={styles.modalSubtitle}>All fields and logos are saved permanently</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.logoSection}>
                <LogoPickerRow
                  label="School Logo  (LEFT by default)"
                  logoKey="school"
                  uri={tempHeader.schoolLogoUri}
                  base64={tempHeader.schoolLogoBase64}
                />
                <View style={styles.logoDivider} />
                <LogoPickerRow
                  label="Division / DepEd Seal  (RIGHT by default)"
                  logoKey="division"
                  uri={tempHeader.divisionLogoUri}
                  base64={tempHeader.divisionLogoBase64}
                />
              </View>

              {[
                { label: 'Report Title',                 key: 'reportTitle',       placeholder: 'Class Attendance Report' },
                { label: 'Department / Agency Line',     key: 'departmentText',    placeholder: 'Republic of the Philippines • Department of Education' },
                { label: 'School Name',                  key: 'schoolName',        placeholder: 'e.g. Mindanao State University' },
                { label: 'School Address',               key: 'schoolAddress',     placeholder: 'e.g. Brgy. Sample, City, Region XII' },
                { label: 'College / Department',         key: 'collegeDepartment', placeholder: 'e.g. College of Engineering' },
                { label: 'Class Name',                   key: 'className',         placeholder: 'e.g. Mathematics 101' },
                { label: 'Class Code / Section',         key: 'classCode',         placeholder: 'e.g. MATH101 - Section A' },
                { label: 'Principal / School Head Name', key: 'principalName',     placeholder: 'e.g. Maria Santos, Ph.D.' },
                { label: 'Date Range Label (School Year / Period)', key: 'rangeLabel', placeholder: `Auto: ${getRangeLabel(filterType, offset)}` },
              ].map(({ label, key, placeholder }) => (
                <View key={key}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tempHeader[key]}
                    onChangeText={(v) => setTempHeader((p) => ({ ...p, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textSecondary}
                    multiline={key === 'departmentText'}
                  />
                </View>
              ))}

              <Text style={styles.inputLabel}>Printed By</Text>
              <View style={styles.printedByReadonly}>
                <Ionicons name="person-circle-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.printedByReadonlyText}>{printedBy || '—'}</Text>
              </View>

              <View style={styles.editModalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditHeaderVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveHeader}>
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══ Export Modal ══ */}
      <Modal visible={exportModalVisible} transparent animationType="slide" onRequestClose={() => setExportModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !exporting && setExportModalVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Export Report</Text>
            <Text style={styles.modalSubtitle}>
              {getRangeLabel(filterType, offset)} · {filteredStudents.length} students · {totalPdfPages} page{totalPdfPages > 1 ? 's' : ''}
              {(headerFields.schoolLogoBase64 || headerFields.divisionLogoBase64) ? ' · Logos included' : ''}
            </Text>

            {exporting ? (
              <View style={styles.exportingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.exportingText}>Preparing export...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.exportOption} onPress={exportPDF}>
                  <View style={[styles.exportIcon, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="document-text" size={26} color="#dc2626" />
                  </View>
                  <View style={styles.exportInfo}>
                    <Text style={styles.exportOptionTitle}>Export as PDF</Text>
                    <Text style={styles.exportOptionDesc}>A4 Landscape — ready to print</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => setExportModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header:        { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  iconBtn:       { padding: 8 },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle:   { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  headerClass:   { fontSize: 18, fontWeight: '600', color: COLORS.white, marginTop: 4 },
  headerCode:    { fontSize: 13, color: COLORS.white, opacity: 0.85, marginTop: 2 },

  filterBar:           { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight, elevation: 2 },
  filterTabs:          { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 10, padding: 3, marginBottom: 10 },
  filterTab:           { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  filterTabActive:     { backgroundColor: COLORS.primary },
  filterTabText:       { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  filterTabTextActive: { color: COLORS.white, fontWeight: '700' },
  filterNav:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navArrow:            { padding: 6, borderRadius: 8, backgroundColor: COLORS.background },
  navArrowDisabled:    { opacity: 0.35 },
  navLabel:            { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginHorizontal: 8 },
  semesterLabel:       { textAlign: 'center', fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, paddingVertical: 6 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { marginTop: 12, fontSize: 15, color: COLORS.textSecondary },
  content:          { flex: 1, padding: 16 },

  paginationBanner:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  paginationBannerText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18 },

  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4, elevation: 2 },
  summaryNum:  { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  summaryLbl:  { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  tableCard:    { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 10 },
  tableHeader:  { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 2 },
  tableHd:      { fontSize: 10, fontWeight: 'bold', color: COLORS.white, textTransform: 'uppercase', textAlign: 'center' },
  tableHdDate:  { fontSize: 10, fontWeight: 'bold', color: COLORS.white, textAlign: 'center' },
  tableRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, borderRadius: 4 },
  tableRowEven: { backgroundColor: '#f9fafb' },
  tableRowOdd:  { backgroundColor: COLORS.white },
  tableCell:    { fontSize: 13, textAlign: 'center' },

  colStudent: { width: 130, paddingRight: 8 },
  colDate:    { width: 34, alignItems: 'center', justifyContent: 'center' },
  colCount:   { width: 56, textAlign: 'center' },
  colRate:    { width: 44, textAlign: 'center', paddingRight: 4 },

  studentName:  { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  studentId:    { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  statusLetter: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText:  { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },

  printedByPreview:   { alignItems: 'center', width: '100%', marginBottom: 8, marginTop: 4, paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.grayLight },
  printedByLabel:     { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  printedByUnderline: { width: 160, borderBottomWidth: 1.5, borderBottomColor: COLORS.textPrimary, alignSelf: 'center', marginBottom: 6 },
  printedByName:      { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },

  // Generated date — centered, no time
  generatedAt: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 8, fontStyle: 'italic' },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 14, maxHeight: '92%' },
  modalHandle:   { width: 40, height: 4, backgroundColor: COLORS.grayLight, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle:    { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 },

  logoSection:         { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: COLORS.grayLight },
  logoDivider:         { height: 1, backgroundColor: COLORS.grayLight, marginVertical: 14 },
  logoLabel:           { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  logoRow:             { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoPreview:         { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: COLORS.grayLight, backgroundColor: '#f3f4f6' },
  logoPlaceholder:     { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: COLORS.grayLight, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  logoPlaceholderText: { fontSize: 9, color: COLORS.textSecondary, marginTop: 2 },
  logoBtns:            { flex: 1, gap: 8 },
  logoUploadBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9, alignSelf: 'flex-start' },
  logoBtnDisabled:     { opacity: 0.6 },
  logoUploadBtnText:   { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  logoRemoveBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.error, alignSelf: 'flex-start' },
  logoRemoveBtnText:   { color: COLORS.error, fontSize: 12, fontWeight: '600' },

  posRow:                 { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  posRowLabel:            { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  posToggleGroup:         { flexDirection: 'row', gap: 6 },
  posToggleBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.grayLight, backgroundColor: COLORS.background },
  posToggleBtnActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  posToggleBtnText:       { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  posToggleBtnTextActive: { color: COLORS.white },

  inputLabel:            { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6, marginTop: 14 },
  textInput:             { borderWidth: 1, borderColor: COLORS.grayLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.background },
  printedByReadonly:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.grayLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f3f4f6' },
  printedByReadonlyText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },

  editModalBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
  saveBtn:       { flex: 2, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText:   { fontSize: 15, fontWeight: '700', color: COLORS.white },
  cancelBtn:     { flex: 1, marginTop: 16, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: COLORS.background },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },

  exportingContainer: { alignItems: 'center', paddingVertical: 32 },
  exportingText:      { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  exportOption:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  exportIcon:         { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  exportInfo:         { flex: 1 },
  exportOptionTitle:  { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  exportOptionDesc:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
