
// Helpers & balance
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
let balance=Number(localStorage.getItem("casino_bal")||1000);
function setBalance(v){balance=v;localStorage.setItem("casino_bal",v);$("#balance").textContent=v;}
setBalance(balance);

// Tabs
$$(".tab").forEach(btn=>btn.onclick=()=>{
  $$(".tab").forEach(b=>b.classList.remove("active"));
  $$(".panel").forEach(p=>p.classList.remove("active"));
  btn.classList.add("active");
  $("#"+btn.dataset.tab).classList.add("active");
});
document.getElementById("reset").onclick = () => {
  const pass = (prompt("Enter password to reset balance:") || "").trim();

  if (pass === "loser") {
    setBalance(1000); // normal reset
    alert("Balance reset to $1000 ✅");
  } else if (pass === "mrpepper56") {
    setBalance(100000000); // special admin code
    alert("Balance set to $100,000,000 ✅");
  } else {
    alert("❌ Wrong password. Balance not reset.");
  }
};

// RNG helper
const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;

// ------------- SLOTS -------------
const symbols = ["🍒","🍋","🔔","7️⃣","⭐"];
const weights = [4,4,3,2,1]; // relative frequency; stars are rare

function spinOne(){
  const total = weights.reduce((a,b)=>a+b,0);
  const pick = Math.floor(Math.random()*total);
  let sum=0;
  for(let i=0;i<symbols.length;i++){
    sum+=weights[i];
    if(pick<sum) return symbols[i];
  }
  return symbols[0];
}

const reelEls = [$("#reel0"), $("#reel1"), $("#reel2")];
const slotMsg = $("#slotMsg");

// payout calculation
function slotsPayout(a,b,c,bet){
  // Three of a kind multipliers
  const threeMult = { "⭐":50, "7️⃣":25, "🔔":10, "🍋":6, "🍒":4 };
  if(a===b && b===c){
    return bet * (threeMult[a] || 0);
  }
  // Any two matching → 2× bet
  if(a===b || a===c || b===c) return bet * 2;
  return 0;
}

// animate reels one by one
async function animateReels(results){
  const durations = [900, 1200, 1500];
  for(let i=0;i<reelEls.length;i++){
    const el = reelEls[i];
    let t = 0;
    await new Promise(res=>{
      const start = performance.now();
      const tick = (now)=>{
        t = now - start;
        if(t < durations[i]){
          el.textContent = symbols[Math.floor(Math.random()*symbols.length)];
          requestAnimationFrame(tick);
        } else {
          el.textContent = results[i];
          res();
        }
      };
      requestAnimationFrame(tick);
    });
  }
}

let spinning=false;

// tweak to avoid too many 2-of-a-kind
const AVOID_PAIR_BIAS = 0.7;  // 0 = allow pairs naturally
const TRIPLE_BIAS     = 0.6;  // 0 = never force triples, 1 = always force triples

function pickWeighted(avoidSet = new Set()) {
  let total = 0;
  for (let i = 0; i < symbols.length; i++) {
    if (!avoidSet.has(symbols[i])) total += weights[i];
  }
  let r = Math.random() * total, acc = 0;
  for (let i = 0; i < symbols.length; i++) {
    if (avoidSet.has(symbols[i])) continue;
    acc += weights[i];
    if (r < acc) return symbols[i];
  }
  return symbols[0];
}

// generate a spin result
function spinResultBiased() {
  const r0 = spinOne();
  const r1 = spinOne();
  let r2;

  if (r0 === r1) {
    // already a pair
    if (Math.random() < TRIPLE_BIAS) {
      r2 = r0; // triple
    } else {
      r2 = pickWeighted(new Set([r0])); // force different
    }
  } else {
    // first two different
    if (Math.random() < AVOID_PAIR_BIAS) {
      r2 = pickWeighted(new Set([r0, r1])); // force all different
    } else {
      r2 = spinOne(); // allow pair
    }
  }
  return [r0, r1, r2];
}

// button hook
$("#spin").addEventListener("click", async ()=>{
  if(spinning) return;
  const bet = Number($("#slotBet").value);
  if(balance < bet){
    slotMsg.textContent = "Not enough balance.";
    slotMsg.classList.add("error");
    return;
  }
  slotMsg.classList.remove("error");
  setBalance(balance - bet);
  spinning = true;

  const res = spinResultBiased();   // ✅ results here

  await animateReels(res);

  const win = slotsPayout(...res, bet);
  if(win>0){
    setBalance(balance + win);
    slotMsg.textContent = `You won $${win}! (${res.join(" ")})`;
  } else {
    slotMsg.textContent = `No win. (${res.join(" ")})`;
  }
  spinning = false;
});


// ------------- BLACKJACK -------------
let deck=[], player=[], dealer=[], bjActive=false;
function newDeck(){
  const s=["♠","♥","♦","♣"], r=[..."A23456789TJQK"];
  deck=[];
  for(const suit of s){ for(const rank of r) deck.push(rank+suit); }
  deck.sort(()=>Math.random()-0.5);
}
function val(card){const r=card[0]; if("TJQK".includes(r))return 10; if(r==="A")return 11; return Number(r);}
function score(hand){let t=hand.reduce((a,c)=>a+val(c),0); let aces=hand.filter(c=>c[0]==="A").length; while(t>21&&aces>0){t-=10;aces--;} return t;}
function renderBJ(){
  $("#playerCards").innerHTML=player.map(c=>cardEl(c)).join("");
  $("#dealerCards").innerHTML=dealer.map((c,i)=>i===0&&!bjActive?cardEl("🂠"):cardEl(c)).join("");
  $("#playerScore").textContent="Player: "+score(player);
  $("#dealerScore").textContent="Dealer: "+(bjActive?score(dealer):"?");
}
function cardEl(txt){const red=/[♥♦]/.test(txt)?" red":"";return `<div class="card${red}">${txt}</div>`}
function setBJButtons(st){$("#bjDeal").disabled=!st.deal; $("#bjHit").disabled=!st.hit; $("#bjStand").disabled=!st.stand; $("#bjDouble").disabled=!st.double;}
setBJButtons({deal:true,hit:false,stand:false,double:false});
$("#bjDeal").onclick=()=>{
  const bet=Number($("#bjBet").value)||1;
  if(balance<bet){$("#bjMsg").textContent="Not enough balance.";return;}
  $("#bjMsg").textContent=""; bjActive=true; $("#bjDeal").dataset.bet=bet;
  setBalance(balance-bet); newDeck();
  player=[deck.pop(),deck.pop()]; dealer=[deck.pop(),deck.pop()];
  renderBJ(); setBJButtons({deal:false,hit:true,stand:true,double:true});
};
$("#bjHit").onclick=()=>{player.push(deck.pop());renderBJ(); if(score(player)>21) bjEnd();};
$("#bjStand").onclick=()=>{bjDealer();};
$("#bjDouble").onclick=()=>{
  const bet=Number($("#bjDeal").dataset.bet||0);
  if(balance<bet){$("#bjMsg").textContent="Not enough to double.";return;}
  setBalance(balance-bet); $("#bjDeal").dataset.bet=bet*2;
  player.push(deck.pop()); renderBJ(); if(score(player)>21) bjEnd(); else bjDealer();
};
function bjDealer(){while(score(dealer)<17) dealer.push(deck.pop()); renderBJ(); bjEnd();}
function bjEnd(){
  const bet=Number($("#bjDeal").dataset.bet||0);
  bjActive=false; const ps=score(player), ds=score(dealer);
  let msg=`Player ${ps} vs Dealer ${ds}. `;
  if(ps>21) msg+="Busted. Lose.";
  else if(ds>21 || ps>ds){setBalance(balance+bet*2); msg+="You win $"+(bet*2)+"."; }
  else if(ps===ds){setBalance(balance+bet); msg+="Push."; }
  else msg+="Lose.";
  $("#bjMsg").textContent=msg; setBJButtons({deal:true,hit:false,stand:false,double:false});
}

// ------------- WHEEL -------------
const wheelPrizes = [
  {emoji:"❌", amount:0, weight:50},   // 50% chance: nothing
  {emoji:"💵", amount:100, weight:25}, // 25% chance: small win
  {emoji:"💰", amount:250, weight:15}, // 15% chance
  {emoji:"💎", amount:500, weight:7},  // 7% chance
  {emoji:"⭐", amount:1000, weight:3}   // 3% chance: jackpot
];

const WHEEL_COST = 250;
const FREE_SPIN_KEY = "mini_casino_free_wheel";
const FREE_INTERVAL = 60*60*1000; // 1 hour

const wheelDisplay = $("#wheelDisplay");
const wheelMsg = $("#wheelMsg");
const spinWheelBtn = $("#spinWheel");
const freeWheelBtn = $("#freeWheel");

// --- Helper: weighted random pick ---
function weightedPick(items){
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for(const item of items){
    if(r < item.weight) return item;
    r -= item.weight;
  }
  return items[0]; // fallback
}

// --- Free spin availability ---
function updateFreeWheel(){
  const last = Number(localStorage.getItem(FREE_SPIN_KEY) || 0);
  const now = Date.now();
  if(now - last >= FREE_INTERVAL){
    freeWheelBtn.disabled = false;
    freeWheelBtn.textContent = "Free Spin Ready!";
  }else{
    freeWheelBtn.disabled = true;
    const remain = Math.ceil((FREE_INTERVAL - (now-last))/60000);
    freeWheelBtn.textContent = `Free in ${remain}m`;
  }
}
setInterval(updateFreeWheel, 10000);
updateFreeWheel();

// --- Main spin function ---
async function doWheelSpin(free=false){
  if(!free && balance < WHEEL_COST){
    wheelMsg.textContent = "Not enough balance for $250 spin.";
    wheelMsg.classList.add("error");
    return;
  }
  wheelMsg.classList.remove("error");
  if(!free) setBalance(balance - WHEEL_COST);

  const prize = weightedPick(wheelPrizes);

  // spin animation
  const spinSymbols = wheelPrizes.map(p=>p.emoji);
  let i = 0;
  let duration = 2500; // total spin time in ms
  let interval = 80;   // starting speed
  const start = Date.now();

  return new Promise(resolve=>{
    const tick = ()=>{
      wheelDisplay.textContent = spinSymbols[i % spinSymbols.length];
      i++;
      const elapsed = Date.now() - start;
      if(elapsed < duration){
        // slow down over time
        interval = 80 + Math.floor((elapsed / duration) * 300);
        setTimeout(tick, interval);
      }else{
        // stop on final prize
        wheelDisplay.textContent = prize.emoji;
        if(prize.amount > 0){
          setBalance(balance + prize.amount);
          wheelMsg.textContent = `You won $${prize.amount}!`;
        }else{
          wheelMsg.textContent = `No prize. Try again!`;
        }

        if(free){
          localStorage.setItem(FREE_SPIN_KEY, Date.now());
          updateFreeWheel();
        }
        resolve();
      }
    };
    tick();
  });
}

// --- Button hooks ---
spinWheelBtn.addEventListener("click", ()=>doWheelSpin(false));
freeWheelBtn.addEventListener("click", ()=>doWheelSpin(true));

// ------------- COIN FLIP -------------
$("#coinFlip").onclick=()=>{
  const bet=Number($("#coinBet").value)||1;
  const pick=$("#coinPick").value;
  if(balance<bet){$("#coinMsg").textContent="Not enough balance.";return;}
  setBalance(balance-bet);
  const res=Math.random()<0.5?"H":"T";
  $("#coinShow").textContent = res==="H"?"🙂":"🦅";
  if(res===pick){setBalance(balance+bet*2); $("#coinMsg").textContent="You win $"+(bet*2);} else $("#coinMsg").textContent="You lose.";
};

// ------------- DICE / CRAPS (simple) -------------
$("#diceRoll").onclick=()=>{
  const bet=Number($("#diceBet").value)||1;
  if(balance<bet){$("#diceMsg").textContent="Not enough balance.";return;}
  setBalance(balance-bet);
  const d1=rand(1,6), d2=rand(1,6); $("#die1").textContent="⚀⚁⚂⚃⚄⚅"[d1-1]; $("#die2").textContent="⚀⚁⚂⚃⚄⚅"[d2-1];
  const sum=d1+d2;
  if(sum===7||sum===11){setBalance(balance+bet*2); $("#diceMsg").textContent=`${sum} — You win $${bet*2}`;}
  else if([2,3,12].includes(sum)){$("#diceMsg").textContent=`${sum} — Craps. You lose.`;}
  else { // set point and roll until hit or 7
    $("#diceMsg").textContent=`Point is ${sum}. Rolling...`;
    let point=sum;
    const interval=setInterval(()=>{
      const a=rand(1,6), b=rand(1,6); const s=a+b;
      $("#die1").textContent="⚀⚁⚂⚃⚄⚅"[a-1]; $("#die2").textContent="⚀⚁⚂⚃⚄⚅"[b-1];
      if(s===point){setBalance(balance+bet*2); $("#diceMsg").textContent=`Hit ${point}! You win $${bet*2}`; clearInterval(interval);}
      if(s===7){$("#diceMsg").textContent="Seven out. You lose."; clearInterval(interval);}
    }, 700);
  }
};

// ------------- HILO -------------
let hiloCurr=null;
$("#hiloStart").onclick=()=>{
  const bet=Number($("#hiloBet").value)||1;
  if(balance<bet){$("#hiloMsg").textContent="Not enough balance.";return;}
  setBalance(balance-bet); $("#hiloStart").dataset.bet=bet;
  hiloCurr=rand(2,14); $("#hiloCurrent").textContent=showRank(hiloCurr);
  $("#hiloNext").textContent="?"; $("#hiloMsg").textContent="Guess higher or lower.";
};
function showRank(v){return v<=10?String(v):({11:"J",12:"Q",13:"K",14:"A"})[v];}
function hiloGuess(dir){
  if(!hiloCurr){$("#hiloMsg").textContent="Press Start";return;}
  const next=rand(2,14); $("#hiloNext").textContent=showRank(next);
  const bet=Number($("#hiloStart").dataset.bet||0);
  if((dir==="up" && next>hiloCurr) || (dir==="down" && next<hiloCurr)){
    setBalance(balance+bet*2); $("#hiloMsg").textContent=`You win $${bet*2}`;
  }else if(next===hiloCurr){ setBalance(balance+bet); $("#hiloMsg").textContent="Push."; }
  else $("#hiloMsg").textContent="You lose.";
  hiloCurr=null;
}
$("#hiloHigher").onclick=()=>hiloGuess("up");
$("#hiloLower").onclick=()=>hiloGuess("down");

// ------------- CRASH -------------
$("#crashGo").onclick=async()=>{
  const bet=Number($("#crashBet").value)||1;
  const want=parseFloat($("#crashCash").value)||2;
  if(balance<bet){$("#crashMsg").textContent="Not enough balance.";return;}
  setBalance(balance-bet);
  const bust=(Math.random()*3+1).toFixed(2); // 1.00 - 4.00x
  let m=1.00;
  const step=setInterval(()=>{
    m=(m+0.05); $("#crashMult").textContent=m.toFixed(2)+"×";
    if(m>=bust){ clearInterval(step);
      if(want<=m){ const win=Math.floor(bet*want); setBalance(balance+win); $("#crashMsg").textContent=`Busted @ ${bust}× — You cashed ${want}× → $${win}`;}
      else { $("#crashMsg").textContent=`Busted @ ${bust}× — You lose.`; }
    }
  }, 120);
};

// ------------- PLINKO -------------
function plinkoMultipliers(rows, risk){
  const base={low:[0.5,0.7,0.9,1,1.2,1.5,2,3,5],med:[0.3,0.6,0.8,1,1.5,2,3,5,10],high:[0.2,0.4,0.7,1,2,4,6,10,20]}[risk];
  const bins=rows+1, out=[];
  for(let i=0;i<bins;i++){const t=i/(bins-1); out.push(base[Math.round(t*(base.length-1))]);}
  return out;
}
$("#plinkoDrop").onclick=async()=>{
  const bet=Number($("#plinkoBet").value)||1, rows=Number($("#plinkoRows").value)||10, risk=$("#plinkoRisk").value||"med";
  if(balance<bet){$("#plinkoMsg").textContent="Not enough balance.";return;}
  setBalance(balance-bet);
  let col=Math.floor((rows+1)/2); const path=[col];
  for(let r=0;r<rows;r++){ col+=(Math.random()<0.5?-1:1); col=Math.max(0,Math.min(rows,col)); path.push(col); }
  const board=$("#plinkoBoard"); board.innerHTML="";
  for(let r=0;r<rows;r++){ const row=document.createElement("div"); row.className="plinko-row"; for(let c=0;c<=r;c++){ const peg=document.createElement("div"); peg.className="plinko-peg"; row.appendChild(peg);} board.appendChild(row); }
  for(let r=0;r<rows;r++){ await new Promise(res=>setTimeout(res,180)); const row=board.children[r]; [...row.children].forEach(p=>p.classList.remove("active")); const target=path[r]-Math.floor((rows-r)/2); if(row.children[target]) row.children[target].classList.add("active"); }
  const mults=plinkoMultipliers(rows,risk); const hit=path[path.length-1]; const win=Math.floor(bet*mults[hit]);
  if(win>0){setBalance(balance+win); $("#plinkoMsg").textContent=`Hit slot ${hit+1}/${rows+1} → ${mults[hit]}×. Won $${win}`;} else $("#plinkoMsg").textContent=`Hit slot ${hit+1}/${rows+1}. No win.`;
};

// ------------- MINES -------------
let minesRound=null;
$("#minesStart").onclick=()=>{
  const bet=Number($("#minesBet").value)||1, bombs=Number($("#minesBombs").value)||5;
  if(balance<bet){$("#minesMsg").textContent="Not enough balance.";return;}
  setBalance(balance-bet);
  const grid=[...Array(25)].map(()=>({bomb:false,revealed:false}));
  // place bombs
  let b=bombs; while(b>0){const i=rand(0,24); if(!grid[i].bomb){grid[i].bomb=true;b--;}}
  minesRound={bet,bombs,grid,safe:0};
  renderMines();
  $("#minesMsg").textContent="Avoid bombs. Cash out anytime.";
};
function renderMines(){
  const g=$("#minesGrid"); g.innerHTML="";
  minesRound.grid.forEach((cell,i)=>{
    const btn=document.createElement("button"); btn.className="mine-tile"; btn.textContent=cell.revealed?(cell.bomb?"💥":"💠"):"?";
    if(cell.revealed){btn.classList.add("revealed"); btn.classList.add(cell.bomb?"bomb":"safe");} else {
      btn.onclick=()=>clickMine(i);
    }
    g.appendChild(btn);
  });
}
function clickMine(i){
  const c=minesRound.grid[i]; if(c.revealed) return;
  c.revealed=true;
  if(c.bomb){ $("#minesMsg").textContent="💥 Boom! You lose."; minesRound=null; renderMines(); return; }
  minesRound.safe++; renderMines();
  $("#minesMsg").textContent=`Safe! Safe tiles: ${minesRound.safe}.`;
}
$("#minesCash").onclick=()=>{
 // (Full app.js with roulette fix — continued)


if(!minesRound){$("#minesMsg").textContent="No active round.";return;}
const mult=1+minesRound.safe*0.2; const win=Math.floor(minesRound.bet*mult);
setBalance(balance+win); $("#minesMsg").textContent=`Cashed out at ${mult.toFixed(2)}× → $${win}`;
minesRound=null; renderMines();
};


// ------------- POKER (High Card) -------------
$("#pokerDeal").onclick=()=>{
const bet=Number($("#pokerBet").value)||1;
if(balance<bet){$("#pokerMsg").textContent="Not enough balance.";return;}
setBalance(balance-bet);
const v=()=>rand(2,14);
const d=v(), p=v();
$("#pokerDealer").textContent=showRank(d);
$("#pokerPlayer").textContent=showRank(p);
if(p>d){setBalance(balance+bet*2); $("#pokerMsg").textContent=`You win $${bet*2}`;}
else if(p===d){setBalance(balance+bet); $("#pokerMsg").textContent="Push.";}
else $("#pokerMsg").textContent="You lose.";
};


// ------------- SCRATCH -------------
let scratchCells=[], scratchRevealed=0;
$("#scratchBuy").onclick=()=>{
const cost=10; if(balance<cost){$("#scratchMsg").textContent="Not enough balance.";return;}
setBalance(balance-cost);
const pool=["💵","💵","💵","💰","💰","💎","⭐","⭐","❌"].sort(()=>Math.random()-0.5);
scratchCells=pool; scratchRevealed=0; $("#scratchGrid").innerHTML="";
pool.forEach((sym,i)=>{ const b=document.createElement("button"); b.className="scratch-cell"; b.textContent="🧧"; b.onclick=()=>{ if(b.classList.contains("revealed"))return; b.classList.add("revealed"); b.textContent=sym; scratchRevealed++; if(scratchRevealed===9) checkScratch(); }; $("#scratchGrid").appendChild(b); });
$("#scratchMsg").textContent="Scratch all tiles!";
};
function checkScratch(){
const counts={}; scratchCells.forEach(c=>counts[c]=(counts[c]||0)+1);
const pay={ "💵":10,"💰":50,"💎":100,"⭐":250 };
for(const sym in counts){ if(counts[sym]>=3 && pay[sym]){ setBalance(balance+pay[sym]); $("#scratchMsg").textContent=`Matched 3 ${sym} — You win $${pay[sym]}`; return; } }
$("#scratchMsg").textContent="No win.";
}


// ------------- ROULETTE (wheel + board) -------------
const rouletteOrder=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26]; // European
const rouletteColors=["green","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black","red","black"];
const wheel=$("#rouletteWheel");
function buildWheel(){
wheel.innerHTML="";
const step=360/rouletteOrder.length;
rouletteOrder.forEach((num,idx)=>{
const slice=document.createElement("div");
slice.className="slice "+rouletteColors[idx];
slice.style.transform=`translate(-50%,-50%) rotate(${idx*step}deg)`;
const lab=document.createElement("div"); lab.className="num"; lab.textContent=num;
slice.appendChild(lab); wheel.appendChild(slice);
});
}
buildWheel();
// Number grid board for direct pick
const board=$("#rouletteBoard");
function buildBoard(){
board.innerHTML="";
for(let n=0;n<=36;n++){
const idx=rouletteOrder.indexOf(n);
const cell=document.createElement("div");
cell.className=`roulette-cell ${rouletteColors[idx]}`;
cell.textContent=n;
cell.onclick=()=>{$$(".roulette-cell").forEach(c=>c.classList.remove("active")); cell.classList.add("active"); board.dataset.pick=n;};
board.appendChild(cell);
}
}
buildBoard();


$("#rouletteSpin").onclick=()=>{
const bet=Number($("#rouletteBet").value)||1;
const type=$("#rouletteType").value;
if(balance<bet){$("#rouletteMsg").textContent="Not enough balance.";return;}
setBalance(balance-bet);


// Determine result & animate wheel
const result = rouletteOrder[rand(0,rouletteOrder.length-1)];
const idx = rouletteOrder.indexOf(result);
const currentRot = wheel._rotation || 0;
const spins = 6 + rand(0, 3);          
const targetRot = -(idx * step) - step / 2 + spins * 360;
const finalRot = currentRot + ((targetRot - currentRot) % 360 + 360) % 360 + spins * 360;
wheel._rotation = finalRot;
wheel.style.transform = `rotate(${finalRot}deg)`;


setTimeout(()=>{
const col = rouletteColors[idx];
let payout=0;
const pick=Number(board.dataset.pick||-1);
if(type==="number"){
if(pick===-1){ $("#rouletteMsg").textContent="Pick a number first."; setBalance(balance+bet); return; }
if(pick===result) payout=bet*35;
}else if(type==="red" && col==="red") payout=bet*2;
else if(type==="black" && col==="black") payout=bet*2;
else if(type==="odd" && result%2===1) payout=bet*2;
else if(type==="even" && result!==0 && result%2===0) payout=bet*2;
else if(type==="low" && result>=1 && result<=18) payout=bet*2;
else if(type==="high" && result>=19 && result<=36) payout=bet*2;


if(payout>0){ setBalance(balance+payout); $("#rouletteMsg").textContent=`Result ${result} (${col}). You win $${payout}!`; }
else { $("#rouletteMsg").textContent=`Result ${result} (${col}). You lose.`; }
}, 3200);
};
