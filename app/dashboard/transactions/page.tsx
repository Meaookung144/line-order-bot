import { db } from "@/lib/db";
import { transactions, users, products } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const allTransactions = await db
    .select({
      transaction: transactions,
      user: users,
      product: products,
    })
    .from(transactions)
    .leftJoin(users, eq(transactions.userId, users.id))
    .leftJoin(products, eq(transactions.productId, products.id))
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  const totalTransactions = allTransactions.length;
  const totalPurchases = allTransactions.filter(
    (t) => t.transaction.type === "purchase"
  ).length;
  const totalTopups = allTransactions.filter(
    (t) => t.transaction.type === "topup"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          รายการธุรกรรม
        </h1>
        <p className="text-gray-600 mt-2">
          ประวัติการทำรายการทั้งหมด (100 รายการล่าสุด)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              รายการทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {totalTransactions}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              การซื้อสินค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {totalPurchases}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              การเติมเงิน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {totalTopups}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>ประวัติรายการ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    วันที่
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    ผู้ใช้
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    ประเภท
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    รายละเอียด
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                    จำนวนเงิน
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                    ยอดคงเหลือ
                  </th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((record) => {
                  const tx = record.transaction;
                  const user = record.user;
                  const product = record.product;

                  const typeConfig = {
                    purchase: { label: "ซื้อสินค้า", color: "text-purple-600", bg: "bg-purple-50" },
                    topup: { label: "เติมเงิน", color: "text-green-600", bg: "bg-green-50" },
                    adjustment: { label: "ปรับยอด", color: "text-blue-600", bg: "bg-blue-50" },
                    refund: { label: "คืนเงิน", color: "text-orange-600", bg: "bg-orange-50" },
                  };

                  const config = typeConfig[tx.type];
                  const amount = parseFloat(tx.amount);
                  const isPositive = tx.type !== "purchase";

                  return (
                    <tr key={tx.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(tx.createdAt).toLocaleDateString("th-TH", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user?.displayName}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {product ? product.name : tx.description || "-"}
                      </td>
                      <td
                        className={`text-right py-3 px-4 font-medium ${
                          isPositive ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isPositive ? "+" : "-"}
                        {formatCurrency(amount)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-900 font-medium">
                        {formatCurrency(parseFloat(tx.afterBalance))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {allTransactions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                ยังไม่มีรายการธุรกรรม
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
