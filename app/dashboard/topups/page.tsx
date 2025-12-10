"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Eye, X } from "lucide-react";
import toast from "react-hot-toast";

interface TopupRecord {
  id: number;
  userId: number;
  amount: string;
  beforeBalance: string | null;
  afterBalance: string | null;
  description: string;
  createdAt: Date;
  user: {
    id: number;
    displayName: string;
    lineUserId: string;
  } | null;
  slip: {
    id: number;
    transRef: string;
    senderName: string | null;
    receiverName: string | null;
    sendingBank: string | null;
    receivingBank: string | null;
    transDate: string | null;
    transTime: string | null;
    status: string;
    r2Url: string | null;
  } | null;
}

export default function TopupsPage() {
  const [topups, setTopups] = useState<TopupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBank, setFilterBank] = useState<string>("all");

  useEffect(() => {
    loadTopups();
  }, []);

  const loadTopups = async () => {
    try {
      const res = await fetch("/api/topups");
      const data = await res.json();
      setTopups(data);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลการเติมเงินได้");
    } finally {
      setLoading(false);
    }
  };

  const openImageModal = (url: string) => {
    setSelectedImage(url);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  // Get unique banks for filter
  const banks = [
    "all",
    ...Array.from(
      new Set(
        topups
          .filter((t) => t.slip?.sendingBank)
          .map((t) => t.slip!.sendingBank!)
      )
    ),
  ];

  // Filter topups
  const filteredTopups = topups.filter((topup) => {
    const matchesSearch =
      topup.user?.displayName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      topup.slip?.transRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topup.slip?.senderName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesBank =
      filterBank === "all" || topup.slip?.sendingBank === filterBank;

    return matchesSearch && matchesBank;
  });

  const totalAmount = filteredTopups.reduce(
    (sum, t) => sum + parseFloat(t.amount),
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
        <h1 className="text-3xl font-bold text-gray-900">ประวัติการเติมเงิน</h1>
        <p className="text-gray-600 mt-2">
          ดูประวัติการเติมเงินทั้งหมดพร้อมรูปสลิป
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {filteredTopups.length}
            </div>
            <p className="text-sm text-gray-600">รายการเติมเงิน</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAmount)}
            </div>
            <p className="text-sm text-gray-600">ยอดเติมเงินรวม</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {
                new Set(topups.filter((t) => t.user).map((t) => t.user!.id))
                  .size
              }
            </div>
            <p className="text-sm text-gray-600">ผู้ใช้ที่เติมเงิน</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>ค้นหาและกรอง</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="ค้นหาชื่อ, เลขอ้างอิง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ธนาคารทั้งหมด</option>
              {banks.slice(1).map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Topups List */}
      <Card>
        <CardHeader>
          <CardTitle>
            รายการเติมเงิน ({filteredTopups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTopups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              ไม่พบรายการเติมเงิน
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTopups.map((topup) => (
                <div
                  key={`${topup.id}-${topup.slip?.id || "no-slip"}`}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-4">
                    {/* Slip Image Thumbnail */}
                    {topup.slip?.r2Url && (
                      <div className="flex-shrink-0">
                        <div
                          className="w-24 h-32 rounded border overflow-hidden cursor-pointer hover:opacity-75 transition-opacity relative group"
                          onClick={() => openImageModal(topup.slip!.r2Url!)}
                        >
                          <img
                            src={topup.slip.r2Url}
                            alt="Slip"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
                            <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Topup Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {topup.user?.displayName || "ไม่ระบุชื่อ"}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {new Date(topup.createdAt).toLocaleString("th-TH", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            +{formatCurrency(parseFloat(topup.amount))}
                          </div>
                          {topup.slip && (
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                topup.slip.status === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : topup.slip.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {topup.slip.status}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {topup.slip?.transRef && (
                          <div>
                            <span className="text-gray-600">เลขอ้างอิง:</span>
                            <span className="ml-2 font-mono text-xs">
                              {topup.slip.transRef}
                            </span>
                          </div>
                        )}
                        {topup.slip?.senderName && (
                          <div>
                            <span className="text-gray-600">ผู้ส่ง:</span>
                            <span className="ml-2">{topup.slip.senderName}</span>
                          </div>
                        )}
                        {topup.slip?.receiverName && (
                          <div>
                            <span className="text-gray-600">ผู้รับ:</span>
                            <span className="ml-2">{topup.slip.receiverName}</span>
                          </div>
                        )}
                        {topup.slip?.sendingBank && (
                          <div>
                            <span className="text-gray-600">ธนาคารผู้ส่ง:</span>
                            <span className="ml-2">{topup.slip.sendingBank}</span>
                          </div>
                        )}
                        {topup.slip?.receivingBank && (
                          <div>
                            <span className="text-gray-600">ธนาคารผู้รับ:</span>
                            <span className="ml-2">
                              {topup.slip.receivingBank}
                            </span>
                          </div>
                        )}
                        {topup.slip?.transDate && topup.slip?.transTime && (
                          <div>
                            <span className="text-gray-600">วันที่-เวลาโอน:</span>
                            <span className="ml-2">
                              {topup.slip.transDate} {topup.slip.transTime}
                            </span>
                          </div>
                        )}
                        {topup.beforeBalance && (
                          <div>
                            <span className="text-gray-600">ยอดก่อน:</span>
                            <span className="ml-2">
                              {formatCurrency(parseFloat(topup.beforeBalance))}
                            </span>
                          </div>
                        )}
                        {topup.afterBalance && (
                          <div>
                            <span className="text-gray-600">ยอดหลัง:</span>
                            <span className="ml-2">
                              {formatCurrency(parseFloat(topup.afterBalance))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeImageModal}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedImage}
              alt="Slip Full Size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
