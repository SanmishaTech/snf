import { Search, User, Plus, Minus, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CartItem, Member } from "../posService";

interface CustomerSidebarProps {
  selectedCustomer: any | null; // POSCustomer
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showMemberDropdown: boolean;
  setShowMemberDropdown: (show: boolean) => void;
  filteredMembers: Member[];
  handleSelectCustomer: (member: Member) => void;
  setShowNewCustomerForm: (show: boolean) => void;
  membersLoading: boolean;
  cart: CartItem[];
  handleUpdateQuantity: (itemId: string, quantity: number) => void;
  handleRemoveItem: (itemId: string) => void;
  totalAmount: number;
  memberDropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function CustomerSidebar({
  selectedCustomer,
  searchQuery,
  setSearchQuery,
  showMemberDropdown,
  setShowMemberDropdown,
  filteredMembers,
  handleSelectCustomer,
  setShowNewCustomerForm,
  membersLoading,
  cart,
  handleUpdateQuantity,
  handleRemoveItem,
  totalAmount,
  memberDropdownRef,
}: CustomerSidebarProps) {
  return (
    <div className="w-full md:w-[340px] md:border-r bg-white flex flex-col h-full overflow-hidden">
      {/* Customer Header */}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">CUSTOMER</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 h-auto p-0 flex items-center gap-1 font-semibold"
            onClick={() => setShowNewCustomerForm(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </Button>
        </div>

        {!selectedCustomer ? (
          <div className="relative" ref={memberDropdownRef}>
            <div className="relative">
              <Input
                placeholder="Search member name/..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowMemberDropdown(true)}
                className="pl-4 pr-10 h-11 bg-slate-50 border-none rounded-xl placeholder:text-slate-400 text-sm focus-visible:ring-1 focus-visible:ring-slate-200"
              />
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            </div>

            {/* Member Dropdown */}
            {showMemberDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[300px]">
                {membersLoading ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading members...</div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No members found</div>
                ) : (
                  <ScrollArea className="flex-1">
                    {filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleSelectCustomer(member)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-b-0 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-slate-700 group-hover:text-blue-600 transition-colors">{member.name}</div>
                            <div className="text-[11px] text-slate-400">{member.mobile}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 relative group">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm uppercase">
              {selectedCustomer.name.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px] truncate text-slate-800 leading-tight">
                {selectedCustomer.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-400">{selectedCustomer.mobile}</span>
                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                <span className="text-[11px] font-bold text-green-600">₹{Number(selectedCustomer.walletBalance || 0).toFixed(2)}</span>
              </div>
            </div>
            <button 
               onClick={() => handleSelectCustomer(null as any)}
               className="p-1 hover:bg-slate-200 rounded-full transition-colors opacity-0 group-hover:opacity-100 absolute right-2 top-2"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        )}
      </div>

      <div className="px-5 flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase leading-none">CURRENT CART</h2>
          <Badge variant="secondary" className="bg-indigo-50 text-indigo-500 hover:bg-indigo-50 rounded-md px-1.5 py-0.5 text-[10px] uppercase font-bold border-none">
            {cart.length} ITEMS
          </Badge>
        </div>

        <ScrollArea className="flex-1 -mx-5 px-5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-30 select-none">
              <User className="w-12 h-12 mb-2" />
              <p className="text-xs font-medium text-slate-500">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-5">
              {cart.map((item) => (
                <div key={item.id} className="flex items-start gap-3 group">
                  <div className="w-[52px] h-[52px] rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 animate-in fade-in zoom-in duration-300">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                         <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h3 className="font-bold text-sm text-slate-800 leading-tight truncate">
                      {item.productName}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      ₹{Number(item.price || 0).toFixed(2)}
                    </p>
                    
                    <div className="flex items-center justify-between pt-1.5">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-500 disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-700">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-500"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <button 
                         onClick={() => handleRemoveItem(item.id)}
                         className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                         title="Remove item"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[13px] text-slate-700">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart Summary Footer */}
      <div className="mt-auto border-t bg-white p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">Cart Total</span>
          <span className="text-lg font-black text-blue-600">₹{totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
