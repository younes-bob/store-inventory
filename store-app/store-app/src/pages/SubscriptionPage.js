import { useState, useEffect } from 'react';
import { PLANS, getPlan, canAddStore } from '../subscription';
import { getSubscription, setSubscription, isSubscriptionActive } from '../supabase';
import { STORES } from '../config';
import { fmt } from '../utils';

function PlanCard({ plan, current, isActive, onActivate, activating }) {
  const isCurrent = current === plan.id && isActive;
  const isPopular = plan.id === 'pro';

  return (
    <div style={{
      borderRadius: 20,
      border: isCurrent ? `2.5px solid ${plan.color}` : '1.5px solid #e5e7eb',
      background: '#fff',
      overflow: 'hidden',
      boxShadow: isCurrent ? `0 0 0 4px ${plan.color}22, 0 8px 32px rgba(0,0,0,.1)` : '0 2px 12px rgba(0,0,0,.06)',
      position: 'relative',
      transition: 'all .2s',
    }}>
      {isPopular && (
        <div style={{ background: plan.gradient, color: '#fff', textAlign: 'center', padding: '6px', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>
          ⭐ BEST VALUE
        </div>
      )}
      {isCurrent && (
        <div style={{ background: plan.gradient, color: '#fff', textAlign: 'center', padding: '6px', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>
          ✓ CURRENT PLAN
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#111', marginBottom: 4 }}>{plan.name}</div>
            {plan.price === 0
              ? <div style={{ fontSize: 28, fontWeight: 900, color: plan.color }}>Free</div>
              : <div>
                  <span style={{ fontSize: 28, fontWeight: 900, color: plan.color }}>{fmt(plan.price)}</span>
                  <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>/month</span>
                </div>
            }
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: plan.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {plan.id === 'free' ? '🆓' : plan.id === 'standard' ? '⭐' : '🚀'}
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '16px 24px' }}>
        {plan.features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: plan.color, fontWeight: 800, fontSize: 14 }}>✓</span>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{f}</span>
          </div>
        ))}
        {plan.missing.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, opacity: 0.4 }}>
            <span style={{ color: '#9ca3af', fontWeight: 800, fontSize: 14 }}>✗</span>
            <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Action */}
      <div style={{ padding: '0 24px 24px' }}>
        {isCurrent
          ? <div style={{ padding: '12px', borderRadius: 12, background: '#f0fdf4', border: `1.5px solid ${plan.color}`, textAlign: 'center', color: plan.color, fontWeight: 800, fontSize: 13 }}>
              ✓ Active Plan
            </div>
          : plan.price === 0
            ? <button onClick={() => onActivate(plan.id, 0)} disabled={activating}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1.5px solid ${plan.color}`, background: '#fff', color: plan.color, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                Downgrade to Free
              </button>
            : <button onClick={() => onActivate(plan.id, 1)} disabled={activating}
                style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: plan.gradient, color: '#fff', fontWeight: 800, fontSize: 14, cursor: activating ? 'not-allowed' : 'pointer', opacity: activating ? 0.7 : 1 }}>
                {activating ? '...' : `Activate ${plan.name}`}
              </button>
        }
      </div>
    </div>
  );
}

function UsageBar({ label, used, max, color }) {
  const pct = max === Infinity ? 0 : Math.min(100, Math.round((used / max) * 100));
  const warn = pct >= 80;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: warn ? '#dc2626' : '#6b7280' }}>
          {used} / {max === Infinity ? '∞' : max}
        </span>
      </div>
      {max !== Infinity && (
        <div style={{ height: 8, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: warn ? '#dc2626' : color, borderRadius: 99, transition: 'width .4s' }}/>
        </div>
      )}
      {max === Infinity && (
        <div style={{ height: 8, background: `${color}33`, borderRadius: 99, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color }}>UNLIMITED</span>
        </div>
      )}
    </div>
  );
}

export default function SubscriptionPage({ storesData }) {
  const [sub, setSub] = useState(null);
  const [activating, setActivating] = useState(false);
  const [msg, setMsg] = useState('');
  const [showActivate, setShowActivate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [months, setMonths] = useState(1);

  useEffect(() => {
    getSubscription().then(setSub);
  }, []);

  const plan = getPlan(sub?.plan || 'free');
  const active = isSubscriptionActive(sub);
  const totalProducts = Object.values(storesData).reduce((s, d) => s + d.items.length, 0);
  const totalStores = STORES.length;

  function daysLeft() {
    if (!sub?.expires_at) return null;
    const diff = new Date(sub.expires_at) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  async function handleActivate(planId, m) {
    if (planId === 'free') {
      if (!window.confirm('Downgrade to Free? You will lose access to premium features.')) return;
    }
    setActivating(true);
    setMsg('');
    const ok = await setSubscription(planId, m || months);
    if (ok) {
      const updated = await getSubscription();
      setSub(updated);
      setMsg(`✅ ${PLANS[planId].name} plan activated!`);
      setShowActivate(false);
    } else {
      setMsg('❌ Failed to activate. Try again.');
    }
    setActivating(false);
  }

  if (!sub) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
      <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin .8s linear infinite', display: 'inline-block' }}>⟳</div>
      <p>Loading subscription...</p>
    </div>
  );

  const days = daysLeft();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px 60px' }}>

      {/* Current plan banner */}
      <div style={{ background: plan.gradient, borderRadius: 20, padding: '24px 28px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, boxShadow: '0 8px 32px rgba(0,0,0,.15)' }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Current Plan</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{plan.name}</div>
          {!active && <div style={{ fontSize: 13, color: '#fecaca', fontWeight: 700 }}>⚠️ Expired — features locked</div>}
          {active && days !== null && (
            <div style={{ fontSize: 13, color: days < 7 ? '#fcd34d' : 'rgba(255,255,255,.8)', fontWeight: 700 }}>
              {days < 7 ? `⚠️ Expires in ${days} day${days !== 1 ? 's' : ''}` : `✓ Expires in ${days} days`}
            </div>
          )}
          {active && days === null && plan.id === 'free' && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>No expiry</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', fontWeight: 600, marginBottom: 4 }}>Price</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>
            {plan.price === 0 ? 'Free' : fmt(plan.price) + '/mo'}
          </div>
        </div>
      </div>

      {/* Usage */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 28, border: '1.5px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
        <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 800, color: '#111' }}>📊 Usage</h3>
        <UsageBar label="Stores" used={totalStores} max={plan.limits.stores} color={plan.color} />
        <UsageBar label="Products" used={totalProducts} max={plan.limits.products} color={plan.color} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          {[
            { label: 'CSV Export', ok: plan.limits.csvExport },
            { label: 'Photo Search (AI)', ok: plan.limits.visualSearch },
            { label: 'Full Sales History', ok: plan.limits.salesHistory === Infinity },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: f.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${f.ok ? '#bbf7d0' : '#fecaca'}` }}>
              <span style={{ fontSize: 13, color: f.ok ? '#15803d' : '#dc2626', fontWeight: 800 }}>{f.ok ? '✓' : '✗'}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: f.ok ? '#15803d' : '#dc2626' }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ padding: '12px 18px', borderRadius: 12, marginBottom: 20, background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, fontWeight: 700, fontSize: 13, color: msg.startsWith('✅') ? '#15803d' : '#dc2626' }}>
          {msg}
        </div>
      )}

      {/* Plans grid */}
      <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 800, color: '#111' }}>💳 Choose a Plan</h3>

      {/* Duration selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px 18px', background: '#f8faff', borderRadius: 12, border: '1px solid #e0e7ff', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Subscription duration:</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { m: 1, label: '1 month' },
            { m: 3, label: '3 months', discount: '5%' },
            { m: 6, label: '6 months', discount: '10%' },
            { m: 12, label: '12 months', discount: '15%' },
          ].map(({ m, label, discount }) => (
            <button key={m} onClick={() => setMonths(m)}
              style={{ padding: '7px 14px', borderRadius: 20, border: months === m ? '2px solid #4f46e5' : '1.5px solid #e5e7eb', background: months === m ? '#eef2ff' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: months === m ? '#4f46e5' : '#374151' }}>
              {label}{discount && <span style={{ marginLeft: 4, color: '#059669', fontSize: 10 }}>-{discount}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
        {Object.values(PLANS).map(p => (
          <PlanCard
            key={p.id}
            plan={p}
            current={sub?.plan || 'free'}
            isActive={active}
            activating={activating}
            onActivate={handleActivate}
          />
        ))}
      </div>

      {/* Payment note */}
      <div style={{ marginTop: 24, padding: '16px 20px', background: '#fffbeb', borderRadius: 12, border: '1px solid #fcd34d' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#92400e' }}>
          💡 <strong>Payment:</strong> After activating a plan, contact us on WhatsApp or by email to complete payment. Plan stays active for your selected duration once confirmed.
        </p>
      </div>
    </div>
  );
}
