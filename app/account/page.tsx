"use client";

import {useEffect, useState} from "react";
import {getSupabaseBrowserClient} from "../../lib/supabase";
import {AccountShell} from "./account-shell";

const human = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default function Account() {
  const [data, setData] = useState<any>({loading: true, orders: []});
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const client = getSupabaseBrowserClient();
      const session = (await client?.auth.getSession())?.data.session;
      if (!session) {
        location.href = `/login?return_to=${encodeURIComponent(location.pathname + location.search)}`;
        return;
      }
      const response = await fetch("/api/account/orders", {headers: {authorization: `Bearer ${session.access_token}`}});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Your orders could not be loaded.");
        setData((value: any) => ({...value, loading: false}));
      } else {
        setData({...result, loading: false});
      }
    })();
  }, []);

  function reviewProof(id: string) {
    window.location.assign(`/account/proof?id=${encodeURIComponent(id)}`);
  }

  const mapOrder = data.orders?.find((order: any) => order.product === "map" && order.entitlement_status === "active");
  const forcedTier = ["map", "plus", "timeline-plus"].includes(data.mapAccessOverride) ? data.mapAccessOverride : null;
  const mapEnabled = data.mapAccessOverride !== "off" && (Boolean(mapOrder) || Boolean(forcedTier));
  const showMapAccess = Boolean(mapOrder) || Boolean(forcedTier) || data.mapAccessOverride === "off";
  const plan = human(forcedTier || mapOrder?.tier || "Map");
  const eventUrl = data.wedding?.slug ? `https://mementohouse.com/map/${data.wedding.slug}` : "Not published yet";

  return <AccountShell email={data.email}>
    <section className="accountPanel" id="overview">
      <div className="eyebrow">Your Memento House account</div>
      <h1>Welcome back.</h1>
      <p>Open digital experiences immediately and follow physical keepsakes through proofing, production, and delivery.</p>
      {error && <p className="authError">{error}</p>}
      {data.loading && !error && <p>Loading your account…</p>}
    </section>

    <section className="accountPanel" id="digital">
      <div className="eyebrow">My digital experiences</div>
      {showMapAccess ? <article className={`digitalExperienceCard ${mapEnabled ? "active" : "paused"}`}>
        <header>
          <div><small>MEMENTO MAP</small><h2>{mapEnabled ? "Your map experience is ready." : "Your map access is paused."}</h2></div>
          {mapEnabled && <a className="button gold" href="/dashboard">Open Memento Map →</a>}
        </header>
        <dl>
          <div><dt>Plan level</dt><dd>{plan}</dd></div>
          <div><dt>Map status</dt><dd>{mapEnabled ? "Active" : "Paused"}</dd></div>
          <div><dt>Wedding / event link</dt><dd>{data.wedding?.slug ? <a href={`/map/${data.wedding.slug}`}>{eventUrl}</a> : eventUrl}</dd></div>
          <div><dt>QR code</dt><dd>{data.wedding?.slug ? <img className="accountQr" src={`/api/qr?url=${encodeURIComponent(eventUrl)}`} alt={`QR code for ${data.wedding.slug}`}/> : "Available after your event link is published"}</dd></div>
        </dl>
      </article> : <div className="emptyAccount"><h2>No digital experiences yet</h2><p>A Memento Map purchase will appear here with its plan, status, event link, and QR code.</p></div>}
    </section>

    <section className="accountPanel" id="orders">
      <div className="eyebrow">My orders</div><h2>Order history</h2>
      <div className="customerOrderList">
        {data.orders?.map((order: any) => {
          const proof = order.proofs?.[0];
          const digital = order.product === "map";
          const active = digital && mapEnabled;
          return <article id={`order-${order.id}`} className={`customerOrder ${digital ? "digitalOrder" : ""}`} key={order.id}>
            <header><div><small>ORDER {order.id.slice(0, 8).toUpperCase()}</small><h2>{human(order.catalog_key || `${order.product} ${order.tier}`)}</h2><time>{new Date(order.created_at).toLocaleDateString()}</time></div><strong>{digital ? (active ? "Delivered · Access active" : "Access paused") : human(order.order_status)}</strong></header>
            {digital ? <div className="customerOrderActions">{active && <a className="button gold" href="/dashboard">Open Memento Map →</a>}<span>Digital delivery requires no questionnaire, proof, production, or shipping.</span></div> : <>
              <div className="orderProgress"><span className="complete">Payment received</span><span className={proof ? "complete" : ""}>Design & proof</span><span className={["approved", "in_production", "ready_to_ship", "shipped", "delivered", "completed", "active"].includes(order.order_status) ? "complete" : ""}>Production</span><span className={["shipped", "delivered", "completed", "active"].includes(order.order_status) ? "complete" : ""}>Delivery</span></div>
              <div className="customerOrderActions">{order.questionnaire_status === "not_started" && <a className="button light" href={`/account/questionnaire?order=${order.id}`}>Complete questionnaire →</a>}{proof && <button className="button gold" onClick={() => reviewProof(proof.id)}>Review proof v{proof.version} →</button>}{order.tracking_url && <a className="button gold" href={order.tracking_url} target="_blank" rel="noreferrer">Track shipment →</a>}</div>
            </>}
          </article>;
        })}
        {!data.loading && !data.orders?.length && <div className="emptyAccount"><h2>No orders yet</h2><p>Your purchases will appear here automatically.</p><a href="/#keepsakes" className="button gold">Explore the collection →</a></div>}
      </div>
    </section>

    <section className="accountPanel" id="proofs">
      <div className="eyebrow">Proofs & approvals</div><h2>Every proof version stays available.</h2>
      {data.orders?.flatMap((order: any) => order.proofs || []).map((proof: any) => <button className="proofHistoryRow" key={proof.id} onClick={() => reviewProof(proof.id)}><b>Proof v{proof.version}</b><span>{human(proof.status)} · {new Date(proof.created_at).toLocaleString()}</span></button>)}
      {!data.orders?.some((order: any) => order.proofs?.length) && <p>No proofs are ready for review.</p>}
    </section>

    <section className="accountPanel" id="profile"><div className="eyebrow">Profile & security</div><h2>{data.email || "Your account"}</h2><p>Use password recovery if you need to change your password, or contact Memento House for account help.</p><a className="button light" href="/forgot-password">Reset password →</a></section>
  </AccountShell>;
}
