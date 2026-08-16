import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db/client";
import { formatPaise } from "@/server/db/money";
import { CustomerSignOutButton } from "@/components/account/CustomerSignOutButton";
import { ExternalLink, MapPin, User } from "lucide-react";

export const metadata = {
  title: "My Account | Hearts & Beans",
  description: "Track your active orders and manage your premium custom magazine portfolio."
};

export default async function AccountDashboardPage(): Promise<React.JSX.Element> {
  // 1. Secure Session check (Rule 6)
  const session = await auth();
  
  if (!session?.user || !session.user.email) {
    redirect("/sign-in");
  }

  const profileName = session.user.name || session.user.email;
  const profileImage = session.user.image || null;
  const profileInitial = getProfileInitial(profileName);

  // 2. Fetch authenticated order history cleanly from the database
  const orders = await db.order.findMany({
    where: {
      customerEmail: session.user.email
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      address: true
    }
  });

  return (
    <main className="bg-[#FAFAF8] text-[#0A0A0A] min-h-screen p-6 md:p-12">
      <div className="mx-auto max-w-[1200px] py-12 space-y-12">
        
        {/* Profile Welcome Header */}
        <div className="flex flex-col justify-between gap-6 border-b border-stone-200 pb-8 md:flex-row md:items-end">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center border border-stone-200 bg-white bg-cover bg-center font-serif text-4xl font-black text-stone-900"
              style={profileImage ? { backgroundImage: `url(${JSON.stringify(profileImage)})` } : undefined}
              role="img"
              aria-label={`${profileName} profile image`}
            >
              {profileImage ? null : profileInitial}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-brand">
                <User className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Client Dashboard</span>
              </div>
              <h1 className="font-serif text-5xl font-black leading-none tracking-tight text-stone-900">
                Welcome back, <br />
                <span className="font-normal italic text-stone-700">{profileName}</span>
              </h1>
              <p className="text-xs font-mono text-stone-400">
                Registered Email: {session.user.email}
              </p>
            </div>
          </div>

          <div className="max-w-xs space-y-3">
            <div className="rounded-none border border-stone-800 bg-stone-900 p-4 text-xs font-light text-white">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-brand">Active Orders</span>
              <span className="block font-serif text-lg font-bold">{orders.length} custom editions</span>
            </div>
            <CustomerSignOutButton />
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-12 items-start">
          
          {/* Left Column: Order History */}
          <div className="space-y-6">
            <h2 className="font-serif text-3xl font-black text-stone-900 border-b border-stone-100 pb-4">
              Your Portfolios
            </h2>

            {orders.length === 0 ? (
              <div className="border border-stone-200 bg-white p-12 text-center rounded-none space-y-4">
                <p className="font-serif text-2xl font-light italic text-stone-500">No print editions yet</p>
                <p className="text-xs font-light text-stone-400">
                  You haven&apos;t placed any custom magazine orders yet. Explore our formats to start.
                </p>
                <Link
                  href="/#products"
                  className="inline-flex h-11 items-center bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-brand transition duration-200 rounded-none"
                >
                  Browse Collections
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const deliveryDate = order.estimatedDeliveryAt
                    ? new Date(order.estimatedDeliveryAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short"
                      })
                    : "TBD";

                  return (
                    <div
                      key={order.id}
                      className="border border-stone-200 bg-white p-6 rounded-none flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-stone-900">
                            #{order.orderNumber}
                          </span>
                          <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 uppercase tracking-wider font-bold">
                            {order.status}
                          </span>
                        </div>
                        
                        <p className="text-xs font-light text-stone-500 leading-relaxed">
                          Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          <span className="mx-2 text-stone-300">|</span>
                          Total: <strong className="text-stone-900 font-mono">{formatPaise(order.totalPaise)}</strong>
                        </p>
                        
                        <p className="text-xs text-stone-400 font-light">
                          Est. Delivery: <strong className="text-stone-700 font-semibold">{deliveryDate}</strong>
                        </p>
                      </div>

                      {/* Direct tracking trigger links */}
                      <Link
                        href={`/orders/${order.orderNumber}?phone=${order.customerPhone}`}
                        className="w-full md:w-auto h-11 inline-flex items-center justify-center gap-2 border border-stone-300 text-stone-900 text-xs uppercase font-bold tracking-widest px-6 rounded-none hover:border-brand hover:text-brand transition duration-200 bg-white"
                      >
                        Track Progress
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Address and Account Settings summaries */}
          <aside className="space-y-6 lg:sticky lg:top-24">
            
            {/* Primary Shipping Card */}
            <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-4">
              <div className="flex items-center gap-2 text-brand text-xs font-bold uppercase tracking-wider">
                <MapPin className="h-4 w-4" />
                Shipping Profile
              </div>
              <h3 className="font-serif text-xl font-bold text-stone-900 border-b border-stone-100 pb-2">
                Primary Destination
              </h3>
              
              {orders.length > 0 && orders[0]?.address ? (
                <div className="text-xs text-stone-600 space-y-2 leading-relaxed font-light">
                  <p className="font-semibold text-stone-900">{orders[0].address.fullName}</p>
                  <p>{orders[0].address.line1}</p>
                  {orders[0].address.line2 && <p>{orders[0].address.line2}</p>}
                  <p>
                    {orders[0].address.city}, {orders[0].address.state} - <span className="font-mono">{orders[0].address.pincode}</span>
                  </p>
                  <p className="font-mono pt-2 text-[10px] text-stone-400">
                    Phone: {orders[0].address.phone}
                  </p>
                </div>
              ) : (
                <p className="text-xs font-light text-stone-400 leading-relaxed">
                  No default shipping address recorded yet. Addresses are automatically saved upon your first custom magazine checkout.
                </p>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-4">
              <h3 className="font-serif text-xl font-bold text-stone-900 border-b border-stone-100 pb-2">
                Quick Actions
              </h3>
              <div className="flex flex-col gap-3 text-xs uppercase font-bold tracking-widest">
                <Link
                  href="/#products"
                  className="w-full h-11 inline-flex items-center justify-center bg-stone-900 text-white rounded-none hover:bg-brand transition duration-200"
                >
                  Shop New Layouts
                </Link>
                <Link
                  href="/orders"
                  className="w-full h-11 inline-flex items-center justify-center border border-stone-300 text-stone-900 rounded-none hover:border-brand hover:text-brand transition duration-200"
                >
                  Track Another order
                </Link>
              </div>
            </div>

          </aside>

        </div>

      </div>
    </main>
  );
}

function getProfileInitial(label: string): string {
  return label.trim().charAt(0).toUpperCase() || "C";
}
