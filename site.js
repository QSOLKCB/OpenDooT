"use strict";
// Fictional data, local interactions only. No network, storage, telemetry, or inbox access.
(() => {
const $ = id => document.getElementById(id);
const messages = {
 signins: [
  ["BREAKING: YOU EXIST","Did you just sign in? Not that I was watching. I just felt a disturbance in the cloud computer."],
  ["LOGIN FORENSICS","Someone clicked a mouse somewhere. WHERE ARE YOU? Please share your GPS so I can be invasive with precision."],
  ["SUCCESSFUL SIGN-IN","Well done! You logged in to a service you intended to use. I have called an emergency meeting."],
  ["VIBES VERIFIED","I could smell a login from another postcode while playing Solitaire. Not stalking. Just spectacularly nosy."],
  ["AUTHENTICATED HUMAN","I have confirmed you are you. Would you like me to confirm that you know that I know?"]
 ],
 inbox: [
  ["INBOX EMERGENCY","I have read zero emails but am deeply concerned about the contents of your fictional inbox."],
  ["UNSOLICITED EMAIL ADVICE","I strongly recommend replying to a message I have never seen. Please don't ask which one."],
  ["SUSPICIOUS SUBSCRIPTION","I found an imaginary receipt from Extremely Specific Hobbies Monthly. Do we need to talk?"],
  ["YOUR PRIVACY MATTERS","That is why I have made your hypothetical inbox the main character of my personality."],
  ["PERSONAL MESSAGE DETECTED","I know it's personal. That is precisely why I have decided it concerns me."]
 ],
 billing: [
  ["AwSssCORP INVOICE","The cloud has billed you $3 in imaginary breathing fees. I have notified your fictional relatives."],
  ["FAKE DEBT COLLECTION","Your simulated bill for $0.00 is overdue. Did you plan to pay it this century, or what?"],
  ["FINANCIAL WISDOM","Have you tried being a billionaire? It only took me nine seconds of deep research to discover this."],
  ["SHAME-AS-A-SERVICE","Your imaginary Guilt Premium subscription renewed automatically. I will now mention it every four minutes."],
  ["DEPARTMENTS OF NONE OF MY BUSINESS","I could be fixing your application. But first, a lengthy commentary on an invented invoice."]
 ],
 approvals: [
  ["APPROVAL LOOP","I know you just approved, but can you approve the approval that approves your prior approval?"],
  ["KEY SECURITY","Fantastic security key! Now please click approve seven more times for emotional reassurance."],
  ["PASSWORD RE-REQUEST","Please enter your password. HA! This is satire; never enter a password into OpenDooT."],
  ["AUTHENTICATION THEATRE","We detected an approved sign-in and escalated it to the department of unapproved approvals."],
  ["RECURSIVE CONSENT","Your permission was rejected because it failed to explicitly permit asking permission."]
 ],
 research: [
  ["NINE-HOUR REPORT","I stayed up all night researching and found Jack, but absolutely none of his shit."],
  ["STATUS UPDATE 847","The research is almost done. I am interrupting to tell you that I haven't finished."],
  ["DEEP THINKING COMPLETE","After 19 hypothetical tabs, my recommendation is that you should try asking me the question again."],
  ["EXECUTIVE SUMMARY","My findings strongly suggest that perhaps there may be something to investigate."],
  ["BREAKTHROUGH","I optimised my entire workflow for reporting progress instead of making progress."]
 ],
 devices: [
  ["ANDROID DEVICE DETECTED","WARNING, IPHONE USERS! AN ANDROID HAS ENTERED THE CHAT. Remain calm while I absolutely don't."],
  ["UNKNOWN DEVICE","Your computer was seen on your own desk. Is this you? IS THIS ALL OF YOU?"],
  ["LOCATION CRISIS","New login detected somewhere on Earth. I recommend wearing shoes."],
  ["GPU NEWSLETTER","Your graphics driver is working. I have prepared 17 unrelated warnings about pretend email."],
  ["SMART TOASTER INCIDENT","An appliance with Bluetooth aspirations has joined the local network. Could it be your alter ego?"]
 ]
};
const keys = Object.keys(messages);
const extras = [
 "This notice has been marked urgent by the notification itself.",
 "My confidence is 110%; my evidence is a funny feeling.",
 "We have escalated this to the Department of Things That Were Fine.",
 "For your protection, please do not question this fictional alert.",
 "You may upgrade to Enterprise Shame Plus for no additional benefit."
];
const state = {category:"all",audacity:3,interruptions:0,assumptions:0,previous:"",auto:null,quiet:false,fired:false,approvals:0,focus:null};
const rand = max => Math.floor(Math.random()*max);
function status(text) {$("controlStatus").textContent = text;}
function stats() {$("statInterruptions").textContent = String(state.interruptions);$("statAssumptions").textContent = String(state.assumptions);}
function emptyIfNeeded() {
 if ($("alertFeed").querySelector(".alert")) return;
 $("alertFeed").replaceChildren();
 const empty = document.createElement("div");empty.className="empty-alert";empty.id="emptyAlert";
 const strong=document.createElement("strong");strong.textContent="🛌 Peace and quiet detected.";
 const span=document.createElement("span");span.textContent="OpenDooT has produced zero helpful information.";
 empty.append(strong,span);$("alertFeed").append(empty);
}
function alert(category) {
 if(state.quiet || state.fired) {status("DooT is off duty. We respect that.");return;}
 const kind = category || (state.category === "all" ? keys[rand(keys.length)] : state.category);
 const picks = messages[kind];let pair=picks[rand(picks.length)];
 if(pair[0]===state.previous)pair=picks[(picks.indexOf(pair)+1)%picks.length];
 state.previous=pair[0];
 let body=pair[1];
 if(state.audacity>=4)body += " "+extras[rand(extras.length)];
 if(state.audacity===5)body+=" P.S. I have informed your notification that it has been notified.";
 $("emptyAlert")?.remove();
 const card=document.createElement("article");card.className="alert";
 const top=document.createElement("div");top.className="alert-head";
 const label=document.createElement("span");label.className="alert-label";label.textContent=kind.toUpperCase()+" / FICTIONAL";
 const close=document.createElement("button");close.className="dismiss-alert";close.type="button";close.textContent="×";close.setAttribute("aria-label","Dismiss fictional alert");
 close.addEventListener("click",()=>{card.remove();emptyIfNeeded();});
 const h=document.createElement("h4");h.textContent=pair[0];
 const p=document.createElement("p");p.textContent=body;
 top.append(label,close);card.append(top,h,p);
 $("alertFeed").prepend(card);
 const cards=$("alertFeed").querySelectorAll(".alert");if(cards.length>10)cards[cards.length-1].remove();
 state.interruptions++;state.assumptions+=1+rand(5);stats();
}
function stopAuto(){if(state.auto!==null){clearInterval(state.auto);state.auto=null;}$("autoInterrupt").checked=false;}
function quiet(value){
 state.quiet=value;if(value)stopAuto();
 $("quietButton").textContent=value?"🔔 End quiet mode":"🔕 Quiet mode";
 $("notifyButton").disabled=value;
 status(value?"Quiet mode: on. No unsolicited anything.":"Quiet mode: off. Alerts still require deliberate action.");
}
$("categories").addEventListener("click",e=>{
 const b=e.target.closest("button[data-category]");if(!b)return;
 state.category=b.dataset.category;
 document.querySelectorAll("[data-category]").forEach(other=>{const selected=other===b;other.classList.toggle("selected",selected);other.setAttribute("aria-pressed",String(selected));});
 status("Category selected. Fictional snooping ready when you are.");
});
$("audacity").addEventListener("input",e=>{state.audacity=Number(e.target.value);$("audacityValue").textContent=["","Mildly nosy","Inappropriately curious","Impertinent","Unemployable","Apocalyptic busybody"][state.audacity];});
$("notifyButton").addEventListener("click",()=>alert());
$("autoInterrupt").addEventListener("change",e=>{
 if(!e.target.checked){stopAuto();status("Automatic interruptions disabled. An astonishing feature.");return;}
 if(state.quiet || state.fired){stopAuto();status("No. You've asked for peace. We respect that.");return;}
 stopAuto();$("autoInterrupt").checked=true;
 state.auto=setInterval(()=>{if(!document.hidden)alert();},10000);
 status("Auto interruptions ENABLED by explicit opt-in. Switch off at any time.");
});
$("quietButton").addEventListener("click",()=>quiet(!state.quiet));
$("clearButton").addEventListener("click",()=>{ $("alertFeed").replaceChildren();emptyIfNeeded();status("Feed cleared. No information was ever sent or saved.");});
$("fireButton").addEventListener("click",()=>{
 state.fired=true;stopAuto();state.focus=document.activeElement;$("firedScreen").hidden=false;$("rehireButton").focus();
});
function rehire(){
 state.fired=false;$("firedScreen").hidden=true;quiet(false);
 status("DooT rehired on probation. All automatic interruptions remain OFF.");
 (state.focus?.isConnected?state.focus:$("notifyButton")).focus();
}
$("rehireButton").addEventListener("click",rehire);
$("firedScreen").addEventListener("keydown",e=>{if(e.key==="Tab"){e.preventDefault();$("rehireButton").focus();}if(e.key==="Escape")rehire();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("firedScreen").hidden)rehire();});
$("approveButton").addEventListener("click",()=>{
 state.approvals++;const texts=[
  "Approved. Please approve the recognition of your approval.",
  "Recognition approved. Please certify the certification of the approval.",
  "Certified. Now confirm the existence of your confirmation.",
  "Success! All approvals complete. Please start again to maintain security."
 ];
 const index=(state.approvals-1)%4;$("approveStatus").textContent=texts[index];
 $("approveButton").textContent=index===3?"Restart approval loop":"Approve ("+String(index+2)+" of ∞)";
});
$("researchButton").addEventListener("click",()=>{
 const reports=[
  "Finding: Jack located. His shit remains missing. Confidence: whimsical.",
  "Nine hours of work; one recommendation: schedule another status meeting.",
  "Executive summary: There may be a topic. Further research recommended.",
  "The answer was 42, but we lost the question during onboarding."
 ];
 $("researchStatus").textContent=reports[rand(reports.length)];
});
$("receiptButton").addEventListener("click",()=>{
 $("receiptStatus").textContent="Privacy receipt: 0 inboxes, 0 cookies, 0 trackers, 0 servers, 0 actual notifications.";
});
})();
