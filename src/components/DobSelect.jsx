// Date of birth as three plain dropdowns (Month / Day / Year) — no typing needed.
// value/onChange use YYYY-MM-DD; emits '' until all three are picked and the date is real.
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(THIS_YEAR - i));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

const cls = "h-12 px-2 rounded-xl text-white bg-blue-950/60 border border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500/70";

export default function DobSelect({ value, onChange }) {
  const [y = '', m = '', d = ''] = (value || '').split('-');

  const update = (ny, nm, nd) => {
    if (ny && nm && nd) {
      const date = new Date(Number(ny), Number(nm) - 1, Number(nd));
      if (date.getMonth() === Number(nm) - 1) return onChange(`${ny}-${nm}-${nd}`);
    }
    // Keep partial picks so dropdowns don't reset while choosing
    onChange(`${ny}-${nm}-${nd}`.replace(/^--$/, ''));
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <select aria-label="Birth month" className={cls} value={m} onChange={e => update(y, e.target.value, d)}>
        <option value="">Month</option>
        {MONTHS.map((name, i) => <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>)}
      </select>
      <select aria-label="Birth day" className={cls} value={d} onChange={e => update(y, m, e.target.value)}>
        <option value="">Day</option>
        {DAYS.map(day => <option key={day} value={day}>{Number(day)}</option>)}
      </select>
      <select aria-label="Birth year" className={cls} value={y} onChange={e => update(e.target.value, m, d)}>
        <option value="">Year</option>
        {YEARS.map(yr => <option key={yr} value={yr}>{yr}</option>)}
      </select>
    </div>
  );
}