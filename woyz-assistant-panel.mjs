import {createChat, questions, demoAnswer} from './woyz-assistant-chat.mjs';
export function mountAssistant(getContext, answer = demoAnswer) {
  const el=id=>document.getElementById(id);
  const thread=el('woyzChatThread'), panel=el('woyzChat'), wrap=el('woyzChatWorkspace');
  const input=el('woyzChatInput'), mic=el('woyzChatMic'), status=el('woyzChatStatus');
  let current, speech, epoch=0, shown=false;
  function clearInput(){
    epoch++; const old=speech;speech=null;old?.abort();
    input.value='';status.textContent='';mic.disabled=false;
  }
  const chat=createChat({answer, render(state){
    shown=state.open;
    panel.hidden=!shown;
    wrap.classList.toggle('assistant-open',shown);
    el('woyzChatOpen').setAttribute('aria-expanded',String(shown));
    el('woyzChatContext').textContent=current
      ? current.name+' · '+current.visits.length+' notes across all templates'
      : 'Select a saved note for a patient with a UHID.';
    thread.replaceChildren(...state.messages.map(({role,text})=>{
      const line=document.createElement('p');line.textContent=role+': '+text;return line;
    }));
    if(state.busy){const waiting=document.createElement('p');waiting.textContent='Thinking…';thread.append(waiting);}
    thread.scrollTop=thread.scrollHeight;
    el('woyzChatAsk').disabled=!current||state.busy;
    el('woyzChatPresets').querySelectorAll('button').forEach(b=>b.disabled=!current||state.busy);
  }});
  function sync(){
    const next=getContext();
    if(next?.id!==current?.id)clearInput();
    current=next;
    chat.select(next);
    return next;
  }
  function ask(text){
    if(!shown || !sync())return;
    clearInput();chat.ask(text);
  }
  for(const question of questions){
    const button=document.createElement('button');button.type='button';button.textContent=question;
    button.addEventListener('click',()=>ask(question));el('woyzChatPresets').append(button);
  }
  el('woyzChatOpen').addEventListener('click',()=>{
    if(sync())chat.show();
    else el('woyzChatOpen').title='Select a saved note for a patient with a UHID.';
  });
  el('woyzChatClose').addEventListener('click',()=>{clearInput();chat.close();el('woyzChatOpen').focus();});
  el('woyzChatForm').addEventListener('submit',event=>{event.preventDefault();ask(input.value);});
  new MutationObserver(sync).observe(el('mainScroll'),{childList:true});
  new MutationObserver(sync).observe(el('appShell'),{attributes:true,attributeFilter:['class']});
  mic.addEventListener('click',async()=>{
    if(!sync())return;
    const version=++epoch;
    const set=text=>{if(version===epoch)status.textContent=text;};
    const unavailable=()=>set('On-device dictation is unavailable here. You can type your question.');
    mic.disabled=true;
    try{
      const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!Speech||!Speech.available)return unavailable();
      const recognizer=new Speech();
      if(!('processLocally' in recognizer))return unavailable();
      recognizer.lang='en-IN';recognizer.processLocally=true;
      if(await Speech.available({langs:[recognizer.lang],processLocally:true})!=='available')return unavailable();
      if(version!==epoch)return;
      speech=recognizer;
      recognizer.onresult=event=>{if(version===epoch){input.value=event.results[0][0].transcript.slice(0,500);set('Review the text, then click Ask.');}};
      recognizer.onend=()=>{if(version===epoch){speech=null;mic.disabled=false;}};
      recognizer.onerror=()=>set('Could not dictate. Try typing your question.');
      recognizer.start();set('Listening on this device…');
    }catch{if(version===epoch)speech=null;unavailable();}
    finally{if(version===epoch&&!speech)mic.disabled=false;}
  });
  sync();
}
