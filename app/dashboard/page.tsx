import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  const totalUsers = allUsers.length;
  const totalCredits = allUsers.reduce(
    (sum, user) => sum + parseFloat(user.creditBalance),
    0
  );
  const totalSpend = allUsers.reduce(
    (sum, user) => sum + parseFloat(user.totalSpend),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          จัดการผู้ใช้งาน
        </h1>
        <p className="text-gray-600 mt-2">
          รายการผู้ใช้งานและเครดิตคงเหลือ
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              ผู้ใช้งานทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              เครดิตรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(totalCredits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              ยอดซื้อสะสมรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {formatCurrency(totalSpend)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้ใช้งาน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    ชื่อ
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                    เครดิตคงเหลือ
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                    วงเงินเครดิต
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                    เครดิตที่ใช้ได้
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                    ยอดซื้อสะสม
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    วันที่สร้าง
                  </th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => {
                  const balance = parseFloat(user.creditBalance);
                  const minCredit = parseFloat(user.minimumCredit);
                  const available = balance + minCredit;

                  return (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.displayName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.lineUserId}
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-medium">
                        {formatCurrency(balance)}
                      </td>
                      <td className="text-right py-3 px-4 text-blue-600">
                        {formatCurrency(minCredit)}
                      </td>
                      <td
                        className={`text-right py-3 px-4 font-medium ${
                          available > 0 ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {formatCurrency(available)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">
                        {formatCurrency(parseFloat(user.totalSpend))}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString("th-TH")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {allUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                ยังไม่มีผู้ใช้งานในระบบ
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
