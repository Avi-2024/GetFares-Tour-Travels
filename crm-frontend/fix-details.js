const fs = require("fs");
const p = "src/components/layout/Payments.tsx";
let c = fs.readFileSync(p, "utf8");

const refBlock = `          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Reference ID</p>
              <p className="text-lg font-bold text-blue-600">
                #{transaction.referenceId}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Amount</p>`;

const amountOnly = `          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Amount</p>`;

if (c.includes("Reference ID")) {
  c = c.replace(refBlock, amountOnly);
  c = c.replace(refBlock.replace(/\n/g, "\r\n"), amountOnly.replace(/\n/g, "\r\n"));
}

c = c.replace(
  `<span className="text-sm text-gray-500">Date</span>
                <span className="text-sm font-medium text-gray-900">
                  {transaction.date}`,
  `<span className="text-sm text-gray-500">Payment date</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDetailDate(transaction.paidAt || transaction.date)}`,
);

c = c.replace(
  `{transaction.verifiedByName ||
                      transaction.customer ||
                      transaction.verifiedBy ||
                      "N/A"}`,
  `{verifiedByDisplay}`,
);

c = c.replace(/<\/motion\.motion.div>/g, "</motion.div>");
c = c.replace(/<\/motion>/g, "</motion.div>");
c = c.replace(/<motion className=/g, "<motion.div className=");

fs.writeFileSync(p, c);
console.log("ok", !c.includes("Reference ID"), c.includes("verifiedByDisplay"));
