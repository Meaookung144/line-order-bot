"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Package } from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: string;
  retailMultiplier: number;
  messageTemplate: string | null;
  stock: number;
}

interface StockItem {
  id: number;
  productId: number;
  itemData: any;
  status: "available" | "sold" | "reserved";
  soldToUserId: number | null;
  soldAt: string | null;
  createdAt: string;
}

interface ProductShortCode {
  id: number;
  productId: number;
  code: string;
}

export default function StockManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [shortCodes, setShortCodes] = useState<ProductShortCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const [itemFormData, setItemFormData] = useState({
    user: "",
    pass: "",
    screen: "",
    pin: "",
  });

  const [autoDuplicate, setAutoDuplicate] = useState(false);
  const [newShortCode, setNewShortCode] = useState("");
  const [quickPaste, setQuickPaste] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadStockItems();
      loadShortCodes();
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data.filter((p: Product) => p.active));
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลสินค้าได้");
    } finally {
      setLoading(false);
    }
  };

  const loadStockItems = async () => {
    if (!selectedProduct) return;

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/stock-items`);
      const data = await res.json();
      setStockItems(data);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลสต็อกได้");
    }
  };

  const loadShortCodes = async () => {
    if (!selectedProduct) return;

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/short-codes`);
      const data = await res.json();
      setShortCodes(data);
    } catch (error) {
      toast.error("ไม่สามารถโหลด short codes ได้");
    }
  };

  const handleAddStockItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error("กรุณาเลือกสินค้าก่อน");
      return;
    }

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/stock-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemData: itemFormData,
          autoDuplicate,
        }),
      });

      if (!res.ok) throw new Error("Failed to add stock item");

      const result = await res.json();
      toast.success(`เพิ่มสต็อกสำเร็จ ${result.created} รายการ`);

      setShowAddForm(false);
      resetItemForm();
      await loadStockItems();
      await loadProducts();
    } catch (error) {
      toast.error("ไม่สามารถเพิ่มสต็อกได้");
    }
  };

  const handleDeleteStockItem = async (itemId: number) => {
    if (!confirm("คุณต้องการลบรายการสต็อกนี้ใช่หรือไม่?")) {
      return;
    }

    try {
      const res = await fetch(`/api/stock-items/${itemId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("ลบสต็อกสำเร็จ");
      await loadStockItems();
      await loadProducts();
    } catch (error) {
      toast.error("ไม่สามารถลบสต็อกได้");
    }
  };

  const handleAddShortCode = async () => {
    if (!selectedProduct || !newShortCode.trim()) {
      toast.error("กรุณากรอก short code");
      return;
    }

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/short-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newShortCode }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add short code");
      }

      toast.success("เพิ่ม short code สำเร็จ");
      setNewShortCode("");
      await loadShortCodes();
    } catch (error: any) {
      toast.error(error.message || "ไม่สามารถเพิ่ม short code ได้");
    }
  };

  const handleDeleteShortCode = async (codeId: number) => {
    if (!selectedProduct) return;

    try {
      const res = await fetch(
        `/api/products/${selectedProduct.id}/short-codes?codeId=${codeId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("ลบ short code สำเร็จ");
      await loadShortCodes();
    } catch (error) {
      toast.error("ไม่สามารถลบ short code ได้");
    }
  };

  const resetItemForm = () => {
    setItemFormData({
      user: "",
      pass: "",
      screen: "",
      pin: "",
    });
    setAutoDuplicate(false);
  };

  const handleQuickPaste = () => {
    if (!quickPaste.trim()) return;

    const parts = quickPaste.trim().split(":");

    if (parts.length >= 2) {
      setItemFormData({
        user: parts[0] || "",
        pass: parts[1] || "",
        screen: parts[2] || "",
        pin: parts[3] || "",
      });
      setQuickPaste("");
      toast.success("นำเข้าข้อมูลสำเร็จ");
    } else {
      toast.error("รูปแบบไม่ถูกต้อง กรุณาใช้รูปแบบ user:pass หรือ user:pass:screen:pin");
    }
  };

  const availableItems = stockItems.filter((item) => item.status === "available");
  const soldItems = stockItems.filter((item) => item.status === "sold");

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
        <h1 className="text-3xl font-bold text-gray-900">จัดการสต็อกสินค้า</h1>
        <p className="text-gray-600 mt-2">
          เพิ่ม แก้ไข และจัดการสต็อกของสินค้าแต่ละรายการ
        </p>
      </div>

      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle>เลือกสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedProduct?.id === product.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{product.name}</h3>
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">
                  ราคา: {formatCurrency(parseFloat(product.price))}
                </p>
                <p className="text-sm text-gray-600">
                  สต็อก: {product.stock} รายการ
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ตัวคูณ: ×{product.retailMultiplier}
                </p>
              </button>
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              ยังไม่มีสินค้าในระบบ กรุณาเพิ่มสินค้าก่อน
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProduct && (
        <>
          {/* Short Codes Management */}
          <Card>
            <CardHeader>
              <CardTitle>Short Codes - {selectedProduct.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newShortCode}
                  onChange={(e) => setNewShortCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddShortCode();
                    }
                  }}
                  placeholder="เช่น nf7, นฟ7"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button
                  onClick={handleAddShortCode}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่ม
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {shortCodes.map((sc) => (
                  <div
                    key={sc.id}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    <span className="font-mono">{sc.code}</span>
                    <button
                      onClick={() => handleDeleteShortCode(sc.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {shortCodes.length === 0 && (
                  <p className="text-gray-500 text-sm">ยังไม่มี short code</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add Stock Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>เพิ่มสต็อก - {selectedProduct.name}</CardTitle>
                {!showAddForm && (
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มสต็อก
                  </Button>
                )}
              </div>
            </CardHeader>
            {showAddForm && (
              <CardContent>
                <form onSubmit={handleAddStockItem} className="space-y-4">
                  {/* Quick Paste */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🚀 วางรหัสแบบเร็ว (รูปแบบ: user:pass หรือ user:pass:screen:pin)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickPaste}
                        onChange={(e) => setQuickPaste(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleQuickPaste();
                          }
                        }}
                        placeholder="ตัวอย่าง: user@email.com:password123 หรือ user:pass:screen1:1234"
                        className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      />
                      <Button
                        type="button"
                        onClick={handleQuickPaste}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        นำเข้า
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      💡 กด Enter หรือคลิก "นำเข้า" เพื่อกรอกข้อมูลอัตโนมัติ
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username / Email
                      </label>
                      <input
                        type="text"
                        value={itemFormData.user}
                        onChange={(e) =>
                          setItemFormData({ ...itemFormData, user: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="text"
                        value={itemFormData.pass}
                        onChange={(e) =>
                          setItemFormData({ ...itemFormData, pass: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Screen / Profile
                      </label>
                      <input
                        type="text"
                        value={itemFormData.screen}
                        onChange={(e) =>
                          setItemFormData({ ...itemFormData, screen: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PIN / Code
                      </label>
                      <input
                        type="text"
                        value={itemFormData.pin}
                        onChange={(e) =>
                          setItemFormData({ ...itemFormData, pin: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoDuplicate"
                      checked={autoDuplicate}
                      onChange={(e) => setAutoDuplicate(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="autoDuplicate" className="text-sm text-gray-700">
                      ทำซ้ำอัตโนมัติ ×{selectedProduct.retailMultiplier} ครั้ง
                      {autoDuplicate && (
                        <span className="text-blue-600 ml-2">
                          (จะสร้าง {selectedProduct.retailMultiplier} รายการ)
                        </span>
                      )}
                    </label>
                  </div>

                  {selectedProduct.messageTemplate && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">ตัวอย่างข้อความ:</p>
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {selectedProduct.messageTemplate
                          .replace("{user}", itemFormData.user || "[user]")
                          .replace("{pass}", itemFormData.pass || "[pass]")
                          .replace("{screen}", itemFormData.screen || "[screen]")
                          .replace("{pin}", itemFormData.pin || "[pin]")}
                      </pre>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      เพิ่มสต็อก
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        resetItemForm();
                      }}
                      variant="outline"
                    >
                      ยกเลิก
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>

          {/* Stock Items List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Stock */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">
                  สต็อกพร้อมขาย ({availableItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-green-200 bg-green-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 font-mono text-sm space-y-1">
                          {item.itemData.user && (
                            <div>
                              <span className="text-gray-600">User:</span>{" "}
                              {item.itemData.user}
                            </div>
                          )}
                          {item.itemData.pass && (
                            <div>
                              <span className="text-gray-600">Pass:</span>{" "}
                              {item.itemData.pass}
                            </div>
                          )}
                          {item.itemData.screen && (
                            <div>
                              <span className="text-gray-600">Screen:</span>{" "}
                              {item.itemData.screen}
                            </div>
                          )}
                          {item.itemData.pin && (
                            <div>
                              <span className="text-gray-600">PIN:</span>{" "}
                              {item.itemData.pin}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteStockItem(item.id)}
                          className="text-red-600 hover:text-red-800 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {availableItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      ไม่มีสต็อกพร้อมขาย
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sold Stock */}
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-600">
                  ขายแล้ว ({soldItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {soldItems.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-gray-200 bg-gray-50 rounded-lg"
                    >
                      <div className="font-mono text-sm space-y-1">
                        {item.itemData.user && (
                          <div className="text-gray-500">
                            <span className="text-gray-600">User:</span>{" "}
                            {item.itemData.user}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          ขาย: {new Date(item.soldAt!).toLocaleString("th-TH")}
                        </div>
                      </div>
                    </div>
                  ))}
                  {soldItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      ยังไม่มีรายการขาย
                    </div>
                  )}
                  {soldItems.length > 10 && (
                    <div className="text-center text-sm text-gray-500">
                      และอีก {soldItems.length - 10} รายการ
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
