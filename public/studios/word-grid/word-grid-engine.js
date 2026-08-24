(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WordGridEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const LETTER_VALUES = Object.freeze({ A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10 });
  class WordGrid {
    constructor(size = 15) { this.reset(size); }
    reset(size = this.size) { if (!Number.isInteger(size) || size < 3) throw new Error('Grid size must be an integer of at least 3.'); this.size=size; this.cells=Array.from({length:size},()=>Array(size).fill(null)); this.words=[]; return this; }
    normalize(word) { return String(word || '').toUpperCase().replace(/[^A-Z]/g, ''); }
    positions(rawWord,row,col,direction) { const word=this.normalize(rawWord),dr=direction==='down'?1:0,dc=direction==='across'?1:0; return [...word].map((letter,index)=>({letter,row:row+dr*index,col:col+dc*index})); }
    validate(rawWord,row,col,direction,options={}) {
      const word=this.normalize(rawWord),ignoreId=options.ignoreId||null;
      if(!word)return {ok:false,message:'Type a word to preview it.'};
      if(!Number.isInteger(row)||!Number.isInteger(col))return {ok:false,message:'Choose a starting square.'};
      if(!['across','down'].includes(direction))return {ok:false,message:'Choose across or down.'};
      const positions=this.positions(word,row,col,direction);
      if(positions.some(p=>p.row<0||p.col<0||p.row>=this.size||p.col>=this.size))return {ok:false,message:'The word runs beyond the board.',positions};
      let overlap=0,connected=false; const center=Math.floor(this.size/2);
      for(const p of positions){const cell=this.cells[p.row][p.col],owners=cell?cell.owners.filter(id=>id!==ignoreId):[];if(owners.length&&cell.letter!==p.letter)return {ok:false,message:`${p.letter} conflicts with ${cell.letter} at row ${p.row+1}, column ${p.col+1}.`,positions,conflict:p};if(owners.length){overlap++;connected=true}for(const [rr,cc] of [[p.row-1,p.col],[p.row+1,p.col],[p.row,p.col-1],[p.row,p.col+1]]){const neighbor=this.cells[rr]&&this.cells[rr][cc];if(neighbor&&neighbor.owners.some(id=>id!==ignoreId))connected=true}}
      const activeWords=this.words.filter(item=>item.id!==ignoreId),crossesCenter=positions.some(p=>p.row===center&&p.col===center);
      if(!activeWords.length&&!crossesCenter)return {ok:false,message:'The first word must cross the center star.',positions};
      if(activeWords.length&&!connected)return {ok:false,message:'Connect the word to at least one existing tile.',positions};
      if(activeWords.length&&overlap===word.length)return {ok:false,message:'That placement adds no new tiles.',positions};
      return {ok:true,message:`Ready to place ${word}.`,positions,overlap};
    }
    place(rawWord,row,col,direction,options={}) { const word=this.normalize(rawWord),result=this.validate(word,row,col,direction,options);if(!result.ok)throw new Error(result.message);if(options.ignoreId)this.remove(options.ignoreId);const id=options.id||`w${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,item={id,word,row,col,direction};this.words.push(item);this.rebuild();return item; }
    remove(id){this.words=this.words.filter(item=>item.id!==id);this.rebuild();return this}
    undo(){if(this.words.length)this.words.pop();this.rebuild();return this}
    rebuild(){this.cells=Array.from({length:this.size},()=>Array(this.size).fill(null));for(const item of this.words)for(const p of this.positions(item.word,item.row,item.col,item.direction)){const current=this.cells[p.row][p.col];if(current&&current.letter!==p.letter)throw new Error('Saved words contain a letter conflict.');if(current)current.owners.push(item.id);else this.cells[p.row][p.col]={letter:p.letter,owners:[item.id]}}return this}
    serialize(){return {version:2,size:this.size,words:this.words.map(item=>({...item}))}}
    toJSON(){return JSON.stringify(this.serialize(),null,2)}
    load(data){const parsed=typeof data==='string'?JSON.parse(data):data;this.reset(Number(parsed.size));for(const item of parsed.words||[])this.place(item.word,Number(item.row),Number(item.col),item.direction,{id:item.id});return this}
  }
  return {WordGrid,LETTER_VALUES};
});
