"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";

interface Slip {
  id: number;
  userId: number;
  transRef: string;
  amount: string;
  senderName: string | null;
  receiverName: string | null;
  sendingBank: string | null;
  receivingBank: string | null;
  transDate: string | null;
  transTime: string | null;
  status: string;
  r2Url: string | null;
  createdAt: Date;
  user: {
    displayName: string;
    lineUserId: string;
  };
}

export default function SlipsPage() {
  const [slips, setSlips] = useState<Slip[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    loadSlips();
  }, []);

  const loadSlips = async () => {
    try {
      const res = await fetch("/api/slips/pending");
      const data = await res.json();
      setSlips(data);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลสลิปได้");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (slipId: number) => {
    if (!confirm("คุณต้องการอนุมัติสลิปนี้ใช่หรือไม่?")) {
      return;
    }

    setProcessing(slipId);
    try {
      const res = await fetch(`/api/slips/${slipId}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to approve");
      }

      toast.success("อนุมัติสลิปสำเร็จ");
      await loadSlips();
    } catch (error) {
      toast.error("ไม่สามารถอนุมัติสลิปได้");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (slipId: number) => {
    const reason = prompt("เหตุผลในการปฏิเสธ:");
    if (!reason) {
      return;
    }

    setProcessing(slipId);
    try {
      const res = await fetch(`/api/slips/${slipId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        throw new Error("Failed to reject");
      }

      toast.success("ปฏิเสธสลิปสำเร็จ");
      await loadSlips();
    } catch (error) {
      toast.error("ไม่สามารถปฏิเสธสลิปได้");
    } finally {
      setProcessing(null);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900">
          สลิปรอตรวจสอบ
        </h1>
        <p className="text-gray-600 mt-2">
          สลิปที่รอการอนุมัติจากแอดมิน
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>สลิปที่รอตรวจสอบ ({slips.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {slips.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              ไม่มีสลิปรอตรวจสอบ
            </div>
          ) : (
            <div className="space-y-4">
              {slips.map((slip) => (
                <div
                  key={slip.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex gap-4">
                    {/* Slip Image */}
                    {slip.r2Url && (
                      <div className="flex-shrink-0">
                        <img
                          src={slip.r2Url}
                          alt="Slip"
                          className="w-32 h-auto rounded border"
                        />
                      </div>
                    )}

                    {/* Slip Details */}
                    <div className="flex-1">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">ผู้ใช้:</span>
                          <span className="ml-2 font-medium">
                            {slip.user.displayName}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">จำนวนเงิน:</span>
                          <span className="ml-2 font-bold text-green-600">
                            {formatCurrency(parseFloat(slip.amount))}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">ผู้ส่ง:</span>
                          <span className="ml-2">{slip.senderName}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">ผู้รับ:</span>
                          <span className="ml-2">{slip.receiverName}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">ธนาคารผู้ส่ง:</span>
                          <span className="ml-2">{slip.sendingBank}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">ธนาคารผู้รับ:</span>
                          <span className="ml-2">{slip.receivingBank}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">เลขที่อ้างอิง:</span>
                          <span className="ml-2 font-mono text-xs">
                            {slip.transRef}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">วันที่-เวลา:</span>
                          <span className="ml-2">
                            {slip.transDate} {slip.transTime}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => handleApprove(slip.id)}
                          disabled={processing === slip.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processing === slip.id ? "กำลังดำเนินการ..." : "อนุมัติ"}
                        </Button>
                        <Button
                          onClick={() => handleReject(slip.id)}
                          disabled={processing === slip.id}
                          variant="destructive"
                        >
                          ปฏิเสธ
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
