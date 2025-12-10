"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Edit2, Check, X } from "lucide-react";
import toast from "react-hot-toast";

interface User {
  id: number;
  lineUserId: string;
  displayName: string;
  creditBalance: string;
  minimumCredit: string;
  totalSpend: string;
  createdAt: Date;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (userId: number, currentValue: string) => {
    setEditingUserId(userId);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditValue("");
  };

  const saveMinimumCredit = async (userId: number) => {
    const numValue = parseFloat(editValue);
    if (isNaN(numValue) || numValue < 0) {
      toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}/minimum-credit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minimumCredit: numValue }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success("อัปเดตวงเงินขั้นต่ำสำเร็จ");
      cancelEdit();
      await loadUsers();
    } catch (error) {
      toast.error("ไม่สามารถอัปเดตวงเงินขั้นต่ำได้");
    }
  };

  const totalUsers = users.length;
  const totalCredits = users.reduce(
    (sum, user) => sum + parseFloat(user.creditBalance),
    0
  );
  const totalSpend = users.reduce(
    (sum, user) => sum + parseFloat(user.totalSpend),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">จัดการผู้ใช้งาน</h1>
        <p className="text-gray-600 mt-2">รายการผู้ใช้งานและเครดิตคงเหลือ</p>
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
                {users.map((user) => {
                  const balance = parseFloat(user.creditBalance);
                  const minCredit = parseFloat(user.minimumCredit);
                  const available = balance + minCredit;
                  const isEditing = editingUserId === user.id;

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
                      <td className="text-right py-3 px-4">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                              step="0.01"
                              min="0"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveMinimumCredit(user.id);
                                } else if (e.key === "Escape") {
                                  cancelEdit();
                                }
                              }}
                            />
                            <button
                              onClick={() => saveMinimumCredit(user.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-blue-600">
                              {formatCurrency(minCredit)}
                            </span>
                            <button
                              onClick={() =>
                                startEdit(user.id, user.minimumCredit)
                              }
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
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

            {users.length === 0 && (
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
