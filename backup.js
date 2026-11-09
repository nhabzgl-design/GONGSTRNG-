/* GONGSTRNG DATA BACKUP — isolated add-on; no cash-drawer commands */
(function(){
  'use strict';
  if(window.__gsBackupReady) return;
  window.__gsBackupReady=true;
  var PREFIXES=['g-','gong_','gong-','last_'];
  function ownedKeys(){
    var out=[];
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i);
      if(k && PREFIXES.some(function(p){return k.indexOf(p)===0;}) && k!=='g-backup-last-export') out.push(k);
    }
    return out.sort();
  }
  function collect(){
    var data={};
    ownedKeys().forEach(function(k){data[k]=localStorage.getItem(k);});
    return {app:'GONGSTRNG MOTORSHOP',format:'gongstrng-backup',version:1,createdAt:new Date().toISOString(),keyCount:Object.keys(data).length,data:data};
  }
  function download(){
    var payload=collect();
    var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    a.download='GONGSTRNG-BACKUP-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1500);
    localStorage.setItem('g-backup-last-export',payload.createdAt);
    var status=document.getElementById('gs-backup-status');
    if(status) status.textContent='Backup file created: '+payload.keyCount+' data records/keys. Save the downloaded JSON somewhere safe.';
  }
  function restore(file){
    var reader=new FileReader();
    reader.onload=function(){
      try{
        var obj=JSON.parse(String(reader.result||''));
        if(!obj || obj.format!=='gongstrng-backup' || !obj.data || typeof obj.data!=='object' || Array.isArray(obj.data)) throw new Error('Invalid backup file.');
        var keys=Object.keys(obj.data);
        if(!keys.length) throw new Error('The backup contains no data.');
        if(!keys.every(function(k){return PREFIXES.some(function(p){return k.indexOf(p)===0;}) && typeof obj.data[k]==='string';})) throw new Error('Backup contains unsupported data keys.');
        if(!confirm('I-RESTORE ang '+keys.length+' data keys mula sa backup na '+(obj.createdAt||'unknown date')+'? Papalitan nito ang kasalukuyang GONGSTRNG data sa device na ito. I-export muna ang kasalukuyang data kung kailangan mo itong itabi.')) return;
        keys.forEach(function(k){localStorage.setItem(k,obj.data[k]);});
        alert('Na-restore ang backup. Ire-reload ang GONGSTRNG.');
        location.reload();
      }catch(e){alert('Hindi ma-restore ang backup: '+(e.message||e));}
    };
    reader.onerror=function(){alert('Hindi mabasa ang backup file.');};
    reader.readAsText(file);
  }
  function panel(){
    var p=document.getElementById('gs-backup-panel');
    if(p) return p;
    p=document.createElement('div');p.id='gs-backup-panel';
    p.style.cssText='position:fixed;inset:0;z-index:2147483002;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.9);font:14px Arial,sans-serif;';
    p.innerHTML='<section style="width:100%;max-width:390px;background:#101010;color:#fff;border:1px solid #ffcc00;border-radius:18px;padding:18px;box-sizing:border-box"><div style="font-size:17px;font-weight:900;color:#ffcc00">💾 DATA BACKUP & RESTORE</div><p style="color:#bbb;line-height:1.5;margin:10px 0">I-save ang GONGSTRNG data bilang JSON file. Itago ang file sa ligtas na lugar. Puwede itong gamitin para maibalik ang records sa device na ito o sa ibang device.</p><button id="gs-backup-export" style="width:100%;padding:13px;background:#ffcc00;color:#000;border:0;border-radius:10px;font-weight:900">DOWNLOAD BACKUP</button><label for="gs-backup-file" style="display:block;margin:14px 0 7px;font-weight:900">RESTORE FROM BACKUP FILE</label><input id="gs-backup-file" type="file" accept=".json,application/json" style="width:100%;color:#fff"><p id="gs-backup-status" style="font-size:11px;color:#aaa;line-height:1.5;margin-top:12px"></p><button id="gs-backup-close" style="width:100%;padding:12px;margin-top:10px;background:#222;color:#fff;border:1px solid #555;border-radius:10px;font-weight:800">CLOSE</button></section>';
    document.body.appendChild(p);
    p.querySelector('#gs-backup-export').onclick=download;
    p.querySelector('#gs-backup-file').onchange=function(){if(this.files&&this.files[0]) restore(this.files[0]);this.value='';};
    p.querySelector('#gs-backup-close').onclick=function(){p.style.display='none';};
    return p;
  }
  function addButton(){
    if(document.querySelector('#root input[placeholder="Enter Password"]')) return;
    var settings=Array.from(document.querySelectorAll('button')).find(function(b){return (b.textContent||'').trim()==='SETTINGS';});
    if(!settings || document.getElementById('gs-backup-open')) return;
    var b=document.createElement('button');b.id='gs-backup-open';b.type='button';b.textContent='💾 BACKUP';
    b.style.cssText='background:#111;color:#ffcc00;border:1px solid #ffcc00;border-radius:999px;padding:6px 12px;font-size:11px;font-weight:900;cursor:pointer;margin-right:6px;';
    b.onclick=function(){var p=panel();var s=p.querySelector('#gs-backup-status');var last=localStorage.getItem('g-backup-last-export');s.textContent='Data keys ready: '+ownedKeys().length+'. Last export: '+(last||'Never');p.style.display='flex';};
    settings.parentNode.insertBefore(b,settings);
  }
  var run=function(){addButton();};
  run();
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  setInterval(run,2500);
  console.log('GONGSTRNG backup/restore add-on ready');
})();