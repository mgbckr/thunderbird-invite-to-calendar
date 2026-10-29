const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('extension/experiment/parent.js', 'utf8');
class Item {
  constructor({ uid = 'event-1', organizer = 'mailto:host@example.test', sequence = 0, stamp = '20261001T120000Z', start = true } = {}) {
    this.id = uid; this.organizer = { id: organizer }; this.props = { SEQUENCE: sequence, DTSTAMP: { icalString: stamp } };
    this.attendees = ['guest']; this.alarms = ['email']; this.startDate = start; this.recurrenceInfo = null;
  }
  clone() { const v = new Item(); Object.assign(v, structuredClone({id:this.id,organizer:this.organizer,props:this.props,attendees:this.attendees,alarms:this.alarms,startDate:this.startDate,recurrenceInfo:null})); return v; }
  getProperty(k) { return this.props[k] ?? null; }
  setProperty(k,v) { this.props[k] = v; }
  deleteProperty(k) { delete this.props[k]; }
  getAttendees() { return [...this.attendees]; }
  removeAttendee(a) { this.attendees = this.attendees.filter(x => x !== a); }
  getAlarms() { return [...this.alarms]; }
  deleteAlarm(a) { this.alarms = this.alarms.filter(x => x !== a); }
  isEvent() { return true; }
}
function fixture() {
  const state = { method:'REQUEST', items:[new Item()], parentless:[] };
  const calendar = { superCalendar: {}, stored: null, async getItem(id) { return this.stored?.id === id ? this.stored : null; }, async addItem(item) { this.stored = item; }, async modifyItem(item) { this.stored = item; } };
  const parser = {parseString(){},getProperties(){return [{propertyName:'METHOD',value:state.method}];},getItems(){return state.items;},getParentlessItems(){return state.parentless;}};
  const sandbox = {ChromeUtils:{importESModule(path){return path.includes('ExtensionCommon') ? {ExtensionCommon:{ExtensionAPI:class {}}} : {cal:{manager:{}}};}},Cc:{'@mozilla.org/calendar/ics-parser;1':{createInstance(){return parser;}}},Ci:{calIIcsParser: {}},console};
  vm.createContext(sandbox); vm.runInContext(source, sandbox);
  return {state,calendar,apply: () => sandbox.applyInvitation(calendar, 'BEGIN:VCALENDAR')};
}
test('create, duplicate, revision, stale revision, cancellation and duplicate cancellation', async () => {
  const f = fixture(); assert.equal(await f.apply(),'created');
  assert.equal(f.calendar.stored.organizer,null); assert.equal(f.calendar.stored.attendees.length,0); assert.equal(f.calendar.stored.alarms.length,0);
  assert.equal(await f.apply(),'ignored: duplicate or older');
  f.state.items = [new Item({sequence:2,stamp:'20261002T120000Z'})]; assert.equal(await f.apply(),'updated');
  f.state.items = [new Item({sequence:1,stamp:'20261003T120000Z'})]; assert.equal(await f.apply(),'ignored: duplicate or older');
  f.state.method = 'CANCEL'; f.state.items = [new Item({sequence:3,stamp:'20261004T120000Z',start:false})]; assert.equal(await f.apply(),'cancelled');
  assert.equal(f.calendar.stored.getProperty('STATUS'),'CANCELLED'); assert.equal(await f.apply(),'ignored: duplicate or older');
});
test('protect unrelated events and reject organizer changes', async () => {
  const f = fixture(); f.calendar.stored = new Item(); assert.match(await f.apply(), /belongs to another/);
  f.calendar.stored = null; await f.apply(); f.state.items = [new Item({organizer:'mailto:other@example.test',sequence:3})]; assert.match(await f.apply(), /organizer mismatch/);
});
test('ignore unsupported messages and recurrence exceptions', async () => {
  const f = fixture(); f.state.method = 'REPLY'; assert.match(await f.apply(), /method/);
  f.state.method = 'CANCEL'; assert.match(await f.apply(), /without an existing/);
  f.state.method = 'REQUEST'; f.state.parentless = [new Item()]; assert.match(await f.apply(), /unsupported recurrence/);
});
