import{r as c,u as P,j as e,a as d,p}from"./index-Bngez1jy.js";import{R as S,A as K,X as $,Y as z,k as M,B,l as T}from"./AreaChart-CKL7HzMx.js";import{B as H,P as I,a as L}from"./PieChart-Txw5eD52.js";const O=c.memo(()=>{const{t:X,lang:s,setActiveScreen:D,currency:x,transactions:g,catLabel:N,getCat:F,allCats:J}=P(),[m,R]=c.useState("month"),[f,A]=c.useState(new Date().getMonth()),[r,E]=c.useState(new Date().getFullYear()),k=c.useRef(null),v=s==="uz"?["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"]:s==="ru"?["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"]:["January","February","March","April","May","June","July","August","September","October","November","December"],u=c.useMemo(()=>g.filter(t=>{const a=new Date(t.date);return m==="month"?a.getMonth()===f&&a.getFullYear()===r:a.getFullYear()===r}),[g,m,f,r]),o=c.useMemo(()=>{const t=u.filter(y=>y.amount>0).reduce((y,j)=>y+j.amount,0),a=u.filter(y=>y.amount<0).reduce((y,j)=>y+Math.abs(j.amount),0),n=t-a,i=t>0?n/t*100:0;return{income:t,expenses:a,netSavings:n,savingsRate:i}},[u]),h=c.useMemo(()=>{const t=new Map;u.filter(n=>n.amount<0).forEach(n=>{const i=t.get(n.categoryId)||0;t.set(n.categoryId,i+Math.abs(n.amount))});const a=o.expenses;return[...t.entries()].map(([n,i])=>({categoryId:n,amount:i,percentage:a>0?i/a*100:0,cat:F(n)})).sort((n,i)=>i.amount-n.amount)},[u,o.expenses,F]),w=c.useMemo(()=>{const t=new Map;return u.forEach(a=>{const n=a.date.slice(-2),i=t.get(n)||{income:0,expense:0};a.amount>0?i.income+=a.amount:i.expense+=Math.abs(a.amount),t.set(n,i)}),[...t.entries()].map(([a,n])=>({day:a,...n})).sort((a,n)=>Number(a.day)-Number(n.day))},[u]),C=c.useMemo(()=>{if(m!=="year")return[];const t=new Map;return g.filter(a=>new Date(a.date).getFullYear()===r).forEach(a=>{const n=new Date(a.date).getMonth(),i=t.get(n)||{income:0,expense:0};a.amount>0?i.income+=a.amount:i.expense+=Math.abs(a.amount),t.set(n,i)}),v.map((a,n)=>({month:a.slice(0,3),...t.get(n)||{income:0,expense:0}}))},[g,m,r,v]),b=["#FF6B6B","#4DABF7","#51CF66","#FAB005","#BE4BDB","#868E96","#FF8787","#74C0FC"],Y=async()=>{if(!k.current)return;const a=window.open("","_blank");if(!a)return;const n=m==="month"?`${v[f]} ${r}`:`${r}`;a.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hamyon - ${n}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #007AFF; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 30px; }
          .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .stat-box { padding: 20px; border-radius: 12px; background: #f5f5f5; }
          .stat-label { font-size: 14px; color: #666; }
          .stat-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
          .income { color: #51CF66; }
          .expense { color: #FF6B6B; }
          .category-list { margin: 20px 0; }
          .category-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>📊 Hamyon - ${s==="uz"?"Moliyaviy Hisobot":s==="ru"?"Финансовый Отчёт":"Financial Report"}</h1>
        <p>${n}</p>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-label">${s==="uz"?"Daromad":s==="ru"?"Доход":"Income"}</div>
            <div class="stat-value income">+${p(o.income,x)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${s==="uz"?"Xarajat":s==="ru"?"Расходы":"Expenses"}</div>
            <div class="stat-value expense">-${p(o.expenses,x)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${s==="uz"?"Sof tejash":s==="ru"?"Чистые сбережения":"Net Savings"}</div>
            <div class="stat-value" style="color: ${o.netSavings>=0?"#51CF66":"#FF6B6B"}">${o.netSavings>=0?"+":""}${p(o.netSavings,x)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${s==="uz"?"Tejash foizi":s==="ru"?"Процент сбережений":"Savings Rate"}</div>
            <div class="stat-value">${o.savingsRate.toFixed(1)}%</div>
          </div>
        </div>
        
        <h2>${s==="uz"?"Kategoriyalar bo'yicha":s==="ru"?"По категориям":"By Category"}</h2>
        <div class="category-list">
          ${h.map(i=>`
            <div class="category-item">
              <span>${i.cat.emoji} ${N(i.cat)}</span>
              <span><strong>${p(i.amount,x)}</strong> (${i.percentage.toFixed(1)}%)</span>
            </div>
          `).join("")}
        </div>
        
        <div class="footer">
          ${s==="uz"?"Hamyon - Moliyaviy yordamchi":s==="ru"?"Hamyon - Финансовый помощник":"Hamyon - Financial Assistant"} • ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `),a.document.close(),a.print()},l={title:s==="uz"?"Hisobotlar":s==="ru"?"Отчёты":"Reports",month:s==="uz"?"Oylik":s==="ru"?"Месяц":"Monthly",year:s==="uz"?"Yillik":s==="ru"?"Год":"Yearly",income:s==="uz"?"Daromad":s==="ru"?"Доход":"Income",expenses:s==="uz"?"Xarajatlar":s==="ru"?"Расходы":"Expenses",netSavings:s==="uz"?"Sof tejash":s==="ru"?"Чистые сбережения":"Net Savings",savingsRate:s==="uz"?"Tejash foizi":s==="ru"?"% сбережений":"Savings Rate",byCategory:s==="uz"?"Kategoriyalar":s==="ru"?"По категориям":"By Category",exportPDF:s==="uz"?"PDF yuklab olish":s==="ru"?"Скачать PDF":"Export PDF",noData:s==="uz"?"Ma'lumot yo'q":s==="ru"?"Нет данных":"No data",trend:s==="uz"?"Trend":s==="ru"?"Тренд":"Trend"};return e.jsx("div",{className:"screen-container pb-32 safe-top",children:e.jsxs("div",{className:"px-4 pt-2",ref:k,children:[e.jsxs("div",{className:"flex items-center gap-4 mb-6",children:[e.jsx(d.button,{whileTap:{scale:.9},onClick:()=>D("home"),className:"w-10 h-10 rounded-full bg-secondary flex items-center justify-center",children:"←"}),e.jsx("div",{className:"flex-1",children:e.jsx("h1",{className:"text-title-1 text-foreground",children:l.title})}),e.jsx(d.button,{whileTap:{scale:.95},onClick:Y,className:"btn-secondary text-sm",children:"📄 PDF"})]}),e.jsx("div",{className:"flex gap-2 mb-4",children:[{key:"month",label:l.month},{key:"year",label:l.year}].map(t=>e.jsx("button",{onClick:()=>R(t.key),className:`flex-1 py-3 rounded-xl font-medium transition-all ${m===t.key?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground"}`,children:t.label},t.key))}),e.jsx("div",{className:"flex gap-2 mb-6 overflow-x-auto pb-2",children:m==="month"?v.map((t,a)=>e.jsx("button",{onClick:()=>A(a),className:`px-4 py-2 rounded-xl whitespace-nowrap text-sm transition-all ${f===a?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground"}`,children:t.slice(0,3)},a)):[r-1,r,r+1].map(t=>e.jsx("button",{onClick:()=>E(t),className:`px-6 py-2 rounded-xl text-sm transition-all ${r===t?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground"}`,children:t},t))}),e.jsxs("div",{className:"grid grid-cols-2 gap-3 mb-6",children:[e.jsxs(d.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},className:"card-elevated p-4 bg-gradient-to-br from-income/10 to-income/5",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:l.income}),e.jsxs("p",{className:"text-xl font-bold text-income",children:["+",p(o.income,x)]})]}),e.jsxs(d.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.1},className:"card-elevated p-4 bg-gradient-to-br from-expense/10 to-expense/5",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:l.expenses}),e.jsxs("p",{className:"text-xl font-bold text-expense",children:["-",p(o.expenses,x)]})]}),e.jsxs(d.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.2},className:"card-elevated p-4",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:l.netSavings}),e.jsxs("p",{className:`text-xl font-bold ${o.netSavings>=0?"text-income":"text-expense"}`,children:[o.netSavings>=0?"+":"",p(o.netSavings,x)]})]}),e.jsxs(d.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.3},className:"card-elevated p-4",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:l.savingsRate}),e.jsxs("p",{className:`text-xl font-bold ${o.savingsRate>=20?"text-income":o.savingsRate>=0?"text-foreground":"text-expense"}`,children:[o.savingsRate.toFixed(1),"%"]})]})]}),(m==="month"?w.length>0:C.length>0)&&e.jsxs(d.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.4},className:"card-elevated p-4 mb-6",children:[e.jsx("h3",{className:"text-title-3 text-foreground mb-4",children:l.trend}),e.jsx("div",{className:"h-[200px]",children:e.jsx(S,{width:"100%",height:"100%",children:m==="month"?e.jsxs(K,{data:w,children:[e.jsx($,{dataKey:"day",axisLine:!1,tickLine:!1,tick:{fontSize:10}}),e.jsx(z,{hide:!0}),e.jsx(M,{type:"monotone",dataKey:"expense",stroke:"#FF6B6B",fill:"#FF6B6B20",strokeWidth:2}),e.jsx(M,{type:"monotone",dataKey:"income",stroke:"#51CF66",fill:"#51CF6620",strokeWidth:2})]}):e.jsxs(H,{data:C,children:[e.jsx($,{dataKey:"month",axisLine:!1,tickLine:!1,tick:{fontSize:10}}),e.jsx(z,{hide:!0}),e.jsx(B,{dataKey:"income",fill:"#51CF66",radius:[4,4,0,0]}),e.jsx(B,{dataKey:"expense",fill:"#FF6B6B",radius:[4,4,0,0]})]})})})]}),h.length>0&&e.jsxs(d.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.5},className:"card-elevated p-4 mb-6",children:[e.jsx("h3",{className:"text-title-3 text-foreground mb-4",children:l.byCategory}),e.jsx("div",{className:"h-[200px] mb-4",children:e.jsx(S,{width:"100%",height:"100%",children:e.jsx(I,{children:e.jsx(L,{data:h.slice(0,6),cx:"50%",cy:"50%",innerRadius:50,outerRadius:80,paddingAngle:2,dataKey:"amount",children:h.slice(0,6).map((t,a)=>e.jsx(T,{fill:t.cat.color||b[a%b.length]},t.categoryId))})})})}),e.jsx("div",{className:"space-y-3",children:h.slice(0,8).map((t,a)=>e.jsxs(d.div,{initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:.6+a*.05},className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-10 h-10 rounded-xl flex items-center justify-center text-lg",style:{backgroundColor:(t.cat.color||b[a])+"20"},children:t.cat.emoji}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex justify-between items-center mb-1",children:[e.jsx("span",{className:"text-sm font-medium text-foreground",children:N(t.cat)}),e.jsx("span",{className:"text-sm font-bold text-foreground",children:p(t.amount,x)})]}),e.jsx("div",{className:"h-2 rounded-full bg-secondary overflow-hidden",children:e.jsx(d.div,{initial:{width:0},animate:{width:`${t.percentage}%`},transition:{delay:.7+a*.05,duration:.5},className:"h-full rounded-full",style:{backgroundColor:t.cat.color||b[a]}})})]}),e.jsxs("span",{className:"text-xs text-muted-foreground w-12 text-right",children:[t.percentage.toFixed(0),"%"]})]},t.categoryId))})]}),u.length===0&&e.jsxs("div",{className:"text-center py-12",children:[e.jsx("span",{className:"text-4xl block mb-4",children:"📊"}),e.jsx("p",{className:"text-muted-foreground",children:l.noData})]})]})})});O.displayName="ReportsScreen";export{O as ReportsScreen};
