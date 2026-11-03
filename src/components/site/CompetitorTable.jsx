const ROWS = [
  ["Built around happy hour", "Yes", "No", "No"],
  ["Shows what's live right now", "Yes", "Limited", "Limited"],
  ["Shows the deal and cutoff time", "Yes", "Sometimes in reviews", "Sometimes in listing hours"],
  ["Sorted by distance", "Yes", "Yes", "Yes"],
  ["Covers Greenville venues", "Yes", "Yes", "Yes"],
  ["Free for consumers", "Yes", "Yes", "Yes"],
];

export default function CompetitorTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
      <table className="w-full min-w-[560px] text-left text-sm sm:text-base">
        <thead className="bg-gray-50 text-gray-900">
          <tr>
            <th scope="col" className="p-4"><span className="sr-only">Feature</span></th>
            <th scope="col" className="p-4 font-bold text-amber-600">Happy Hour Flower</th>
            <th scope="col" className="p-4 font-bold">Yelp</th>
            <th scope="col" className="p-4 font-bold">Google Maps</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([label, ...vals]) => (
            <tr key={label} className="border-t border-gray-100">
              <th scope="row" className="p-4 font-semibold text-gray-900">{label}</th>
              {vals.map((v, i) => <td key={i} className={`p-4 ${i === 0 ? "font-semibold text-gray-900" : "text-gray-600"}`}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}