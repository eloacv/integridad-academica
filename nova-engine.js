class NovaEngine {
  constructor(element, ui = {}) { this.el = element; this.ui = ui; this.timer = null; this.typingTimer = null; this.setState("idle"); }
  setState(state, duration = 0) { clearTimeout(this.timer); this.el.className = `nova-character nova-${state}`; void this.el.offsetWidth; if (duration > 0) this.timer = setTimeout(() => this.idle(), duration); }
  enter() { this.hideSpeech(); this.setState("enter"); this.timer = setTimeout(() => this.idle(), 1320); }
  idle(){this.setState("idle");} think(){this.setState("think");} happy(){this.setState("happy",820);} worried(){this.setState("worried");} celebrate(){this.setState("celebrate",2200);}
  say(title,text,speed=20){ const {speech,speechTitle,speechText}=this.ui; if(!speech||!speechText)return; clearInterval(this.typingTimer); speech.hidden=false; if(speechTitle)speechTitle.textContent=title; speechText.textContent=""; this.idle(); let i=0; this.typingTimer=setInterval(()=>{speechText.textContent+=text[i]||""; i++; if(i>=text.length)clearInterval(this.typingTimer);},speed); }
  hideSpeech(){ if(this.ui.speech)this.ui.speech.hidden=true; clearInterval(this.typingTimer); }
}
window.NovaEngine=NovaEngine;
