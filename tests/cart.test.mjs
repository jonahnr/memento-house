import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCart,cartPrice,cartKey} from '../lib/cart.ts';
import {paidCartItems} from '../lib/cart-paid-items.ts';
const map={id:'map-one',product:'map',tier:'timeline-plus',addon:'none',customization:''};
const deck={id:'deck-one',product:'deck',tier:'signature',addon:'open-5',customization:JSON.stringify({summary:{partner1:'Alice',partner2:'Sam'},cards:['saved design']})};
test('mixed cart retains each saved design and uses catalog cents',()=>{const items=validateCart([map,deck]);assert.equal(items[1].customization,deck.customization);assert.equal(items.reduce((sum,item)=>sum+cartPrice(item),0),38800);assert.equal(cartPrice(validateCart([{...map,price:1}])[0]),17900)});
test('cart rejects tampered plans, add-ons, duplicates, and missing board designs',()=>{for(const items of [[],[map,map],[map,{...map,id:'second-map'}],[{...deck,addon:'discount'}],[{...map,tier:'bespoke'}],[{id:'board',product:'unity',tier:'signature-board'}],[{...deck,customization:'invalid JSON'}],Array.from({length:13},(_,i)=>({...deck,id:String(i)}))])assert.throws(()=>validateCart(items))});
test('cart storage is isolated per signed-in account',()=>{assert.notEqual(cartKey('alice'),cartKey('bob'));assert.match(cartKey('alice'),/v1/)});
test('paid cart reconciles reordered Stripe lines, discounts, and separate designs',()=>{
 const metadata={cart_count:'2',cart_item_0:JSON.stringify({...map,customizationId:''}),cart_item_1:JSON.stringify({...deck,customizationId:'saved-deck'})};
 const lines=[{quantity:1,currency:'usd',amount_total:18810,price:{product:{metadata:{cart_item_id:deck.id}}}},{quantity:1,currency:'usd',amount_total:16110,price:{product:{metadata:{cart_item_id:map.id}}}}];
 const items=paidCartItems(metadata,lines,'usd',34920);assert.equal(items[0].amount,16110);assert.equal(items[1].amount,18810);assert.equal(items[1].customizationId,'saved-deck');
 assert.throws(()=>paidCartItems(metadata,[lines[0],lines[0]],'usd',37620));assert.throws(()=>paidCartItems(metadata,lines,'usd',1));assert.throws(()=>paidCartItems(metadata,[{...lines[0],quantity:2},lines[1]],'usd',34920));
});
