import React, { useEffect, useState, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

function App() {
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("orders");
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState('default');

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
          console.log('Notification permission:', permission);
        });
      } else {
        setNotificationPermission(Notification.permission);
      }
    }
  }, []);

  // Function to show browser notification
  const showBrowserNotification = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🍽️ New Order Received!', {
          body: 'A new food order has been placed',
          icon: '/favicon.ico',
          tag: 'new-order',
          requireInteraction: true
        });
        console.log('📢 Browser notification sent');
      } catch (error) {
        console.log('Browser notification failed:', error);
      }
    }
  }, []);

  // Fallback sound function - MOVED BEFORE playNotificationSound
  const playFallbackSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      oscillator.stop(audioContext.currentTime + 0.5);

      console.log('🔊 Fallback sound played');
    } catch (error) {
      console.log('❌ Fallback sound failed:', error);
      showBrowserNotification();
    }
  }, [showBrowserNotification]);

  // Improved function to play notification sound - MOVED AFTER playFallbackSound
  const playNotificationSound = useCallback(() => {
    console.log('🔊 Attempting to play notification sound...');

    try {
      const audio = new Audio('/Best Notification Tone.mp3');
      audio.volume = 0.7;

      audio.addEventListener('error', (e) => {
        console.log('❌ Audio error:', e);
        showBrowserNotification();
      });

      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🔊 Notification sound played successfully');
          })
          .catch(error => {
            console.log('❌ Audio play failed:', error);
            playFallbackSound();
          });
      }
    } catch (error) {
      console.log('❌ Audio creation failed:', error);
      playFallbackSound();
    }
  }, [showBrowserNotification, playFallbackSound]);

  // Test sound function for debugging
  const testNotificationSound = () => {
    console.log('🧪 Testing notification sound...');
    playNotificationSound();
  };

  // Fetch data function
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching data...');

      const [statsResponse, ordersResponse] = await Promise.all([
        fetch("https://1vlg5qkgm2.execute-api.us-east-1.amazonaws.com/dev/api/stats"),
        fetch("https://1vlg5qkgm2.execute-api.us-east-1.amazonaws.com/dev/api/orders")
      ]);

      if (!statsResponse.ok || !ordersResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const statsData = await statsResponse.json();
      const ordersData = await ordersResponse.json();

      const currentOrderCount = ordersData.length;
      console.log(`📊 Orders: Previous=${previousOrderCount}, Current=${currentOrderCount}`);

      if (previousOrderCount > 0 && currentOrderCount > previousOrderCount) {
        const newOrdersCount = currentOrderCount - previousOrderCount;
        console.log(`🎉 NEW ORDER DETECTED! ${newOrdersCount} new order(s)`);
        playNotificationSound();

        setTimeout(() => {
          showBrowserNotification();
        }, 1000);
      } else if (previousOrderCount === 0 && currentOrderCount > 0) {
        console.log(`📦 Initial load: ${currentOrderCount} orders`);
      } else if (currentOrderCount === previousOrderCount) {
        console.log('✅ No new orders');
      }

      setStats(statsData);
      setOrders(ordersData);
      setPreviousOrderCount(currentOrderCount);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("❌ Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [previousOrderCount, playNotificationSound, showBrowserNotification]);

  // Initial fetch and set up polling
  useEffect(() => {
    fetchData();

    const intervalId = setInterval(fetchData, 10000);
    console.log('⏰ Polling started (10s interval)');

    return () => {
      console.log('🛑 Polling stopped');
      clearInterval(intervalId);
    };
  }, [fetchData]);

  // Manual refresh function
  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    fetchData();
  };

  const statusData = [
    { name: "Confirmed", value: stats.confirmed_orders || 0 },
  ];

  const revenueData = [
    { name: "Jan", revenue: 4000 },
    { name: "Feb", revenue: 3000 },
    { name: "Mar", revenue: 2000 },
    { name: "Apr", revenue: 2780 },
    { name: "May", revenue: 1890 },
    { name: "Jun", revenue: 2390 },
  ];

  const COLORS = ['#667eea', '#764ba2', '#f093fb'];

  // Format time for last updated
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.brand}>
            <div style={styles.logo}>🍽️</div>
            <div>
              <h1 style={styles.brandName}>Bansari</h1>
              <p style={styles.brandSubtitle}>Restaurant Dashboard</p>
            </div>
          </div>
          <div style={styles.headerActions}>
            <div style={styles.updateSection}>
              {lastUpdated && (
                <div style={styles.lastUpdated}>
                  <span style={styles.updatedText}>Last updated</span>
                  <span style={styles.updatedTime}>{formatTime(lastUpdated)}</span>
                </div>
              )}
              <button
                style={styles.refreshButton}
                onClick={handleManualRefresh}
                disabled={isLoading}
              >
                <span style={styles.refreshIcon}>{isLoading ? '🔄' : '↻'}</span>
                Refresh
              </button>
              <button
                style={styles.testButton}
                onClick={testNotificationSound}
              >
                <span style={styles.testIcon}>🔔</span>
                Test Sound
              </button>
            </div>

            <div style={styles.userSection}>
              <div style={styles.userInfo}>
                <div style={styles.userAvatar}>👤</div>
                <div style={styles.userDetails}>
                  <span style={styles.userName}>Admin</span>
                  <span style={styles.userRole}>Manager</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div style={styles.container}>
        {/* Sidebar */}
        <nav style={styles.sidebar}>
          <div style={styles.navSection}>
            <button
              style={{
                ...styles.navButton,
                ...(activeTab === "dashboard" ? styles.navButtonActive : {}),
              }}
              onClick={() => setActiveTab("dashboard")}
            >
              <span style={styles.navIcon}>📊</span>
              <span style={styles.navText}>Dashboard</span>
            </button>
            <button
              style={{
                ...styles.navButton,
                ...(activeTab === "orders" ? styles.navButtonActive : {}),
              }}
              onClick={() => setActiveTab("orders")}
            >
              <span style={styles.navIcon}>📦</span>
              <span style={styles.navText}>Orders</span>
              {orders.length > 0 && (
                <span style={styles.orderBadge}>{orders.length}</span>
              )}
            </button>
          </div>

          <div style={styles.sidebarFooter}>
            <div style={styles.systemInfo}>
              <span style={styles.systemText}>
                Notifications: {notificationPermission}
              </span>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main style={styles.main}>
          {isLoading && activeTab === "dashboard" && !lastUpdated && (
            <div style={styles.loadingOverlay}>
              <div style={styles.loadingSpinner}></div>
              <p style={styles.loadingText}>Loading dashboard...</p>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div>
              {/* Welcome Section */}
              <div style={styles.welcomeSection}>
                <h2 style={styles.welcomeTitle}>Welcome back, Admin! 👋</h2>
                <p style={styles.welcomeSubtitle}>Here's what's happening with your restaurant today.</p>
              </div>

              {/* Stats Cards */}
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statHeader}>
                    <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      💰
                    </div>
                    <div style={styles.statTrend}>
                      <span style={styles.trendUp}>↑ 12%</span>
                    </div>
                  </div>
                  <div style={styles.statContent}>
                    <h3 style={styles.statLabel}>Total Revenue</h3>
                    <p style={styles.statValue}>${stats.revenue || 0}</p>
                  </div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statHeader}>
                    <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                      📦
                    </div>
                    <div style={styles.statTrend}>
                      <span style={styles.trendUp}>↑ 8%</span>
                    </div>
                  </div>
                  <div style={styles.statContent}>
                    <h3 style={styles.statLabel}>Total Orders</h3>
                    <p style={styles.statValue}>{stats.total_orders || 0}</p>
                  </div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statHeader}>
                    <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                      ✅
                    </div>
                    <div style={styles.statTrend}>
                      <span style={styles.trendUp}>↑ 15%</span>
                    </div>
                  </div>
                  <div style={styles.statContent}>
                    <h3 style={styles.statLabel}>Completed</h3>
                    <p style={styles.statValue}>{stats.delivered_orders || 0}</p>
                  </div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statHeader}>
                    <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                      ⏳
                    </div>
                    <div style={styles.statTrend}>
                      <span style={styles.trendDown}>↓ 5%</span>
                    </div>
                  </div>
                  <div style={styles.statContent}>
                    <h3 style={styles.statLabel}>Pending</h3>
                    <p style={styles.statValue}>{(stats.total_orders || 0) - (stats.delivered_orders || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div style={styles.chartsGrid}>
                <div style={styles.chartCard}>
                  <div style={styles.chartHeader}>
                    <h3 style={styles.chartTitle}>Order Status</h3>
                    <div style={styles.chartLegend}>
                      <div style={styles.legendItem}>
                        <div style={{ ...styles.legendColor, backgroundColor: COLORS[0] }}></div>
                        <span>Confirmed</span>
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={styles.chartCard}>
                  <div style={styles.chartHeader}>
                    <h3 style={styles.chartTitle}>Revenue Overview</h3>
                    <div style={styles.chartActions}>
                      <button style={styles.chartActionButton}>6M</button>
                      <button style={styles.chartActionButton}>1Y</button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="name"
                        stroke="#888"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="#888"
                        fontSize={12}
                      />
                      <Tooltip
                        contentStyle={styles.tooltip}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="url(#colorRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#667eea" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#764ba2" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Order Management</h2>
                  <p style={styles.sectionSubtitle}>Manage and track all customer orders</p>
                </div>
                <div style={styles.ordersStats}>
                  <div style={styles.orderStat}>
                    <span style={styles.orderStatLabel}>Total Orders</span>
                    <span style={styles.orderStatValue}>{orders.length}</span>
                  </div>
                </div>
              </div>

              {isLoading && orders.length === 0 ? (
                <div style={styles.loadingState}>
                  <div style={styles.loadingSpinner}></div>
                  <p style={styles.loadingText}>Loading orders...</p>
                </div>
              ) : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                      <tr>
                        <th style={styles.th}>Customer Phone</th>
                        <th style={styles.th}>Order Items</th>
                        <th style={styles.th}>Total Amount</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice().reverse().map((order, index) => (
                        <tr key={index} style={styles.tableRow}>
                          <td style={styles.td}>
                            <div style={styles.phoneCell}>
                              <span style={styles.phoneIcon}>📱</span>
                              {order.phone}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.items}>
                              {order.items.map((item, i) => (
                                <span key={i} style={styles.itemTag}>
                                  {item.name} ×{item.quantity}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <strong style={styles.amount}>
                              ${order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                            </strong>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.statusBadge}>
                              Confirmed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Modern Light Theme Styles
const styles = {
  app: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    color: "#1e293b",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    lineHeight: 1.6,
  },
  header: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    padding: "16px 0",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 1px 10px rgba(0, 0, 0, 0.05)",
  },
  headerContent: {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 32px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  logo: {
    fontSize: "40px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "12px",
    padding: "8px",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  },
  brandName: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: 0,
    color: "#1e293b",
    letterSpacing: "-0.5px",
  },
  brandSubtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
    fontWeight: "500",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
  },
  updateSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  lastUpdated: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    marginRight: "8px",
  },
  updatedText: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "500",
  },
  updatedTime: {
    fontSize: "14px",
    color: "#1e293b",
    fontWeight: "600",
  },
  refreshButton: {
    backgroundColor: "#ffffff",
    color: "#475569",
    border: "1px solid #e2e8f0",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  },
  refreshIcon: {
    fontSize: "16px",
  },
  testButton: {
    backgroundColor: "#667eea",
    color: "#ffffff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
  },
  testIcon: {
    fontSize: "16px",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 16px",
    borderRadius: "12px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  userAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#667eea",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    color: "#ffffff",
    boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
  },
  userDetails: {
    display: "flex",
    flexDirection: "column",
  },
  userName: {
    fontWeight: "600",
    color: "#1e293b",
    fontSize: "14px",
  },
  userRole: {
    fontSize: "12px",
    color: "#64748b",
  },
  container: {
    display: "flex",
    maxWidth: "1400px",
    margin: "0 auto",
    minHeight: "calc(100vh - 80px)",
  },
  sidebar: {
    width: "280px",
    backgroundColor: "#ffffff",
    padding: "24px 0",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "2px 0 10px rgba(0, 0, 0, 0.02)",
  },
  navSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "0 20px",
  },
  navButton: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 20px",
    background: "transparent",
    border: "none",
    color: "#64748b",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "500",
    transition: "all 0.2s ease",
    position: "relative",
  },
  navButtonActive: {
    backgroundColor: "#667eea",
    color: "#ffffff",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
    transform: "translateX(4px)",
  },
  navIcon: {
    fontSize: "20px",
    width: "24px",
    textAlign: "center",
  },
  navText: {
    flex: 1,
    textAlign: "left",
  },
  orderBadge: {
    backgroundColor: "#f56565",
    color: "#ffffff",
    borderRadius: "12px",
    padding: "2px 8px",
    fontSize: "12px",
    fontWeight: "600",
    minWidth: "20px",
    textAlign: "center",
  },
  sidebarFooter: {
    padding: "20px",
    borderTop: "1px solid #e2e8f0",
  },
  systemInfo: {
    textAlign: "center",
  },
  systemText: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "500",
  },
  main: {
    flex: 1,
    padding: "32px",
    backgroundColor: "#f8fafc",
    position: "relative",
    overflowY: "auto",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(248, 250, 252, 0.9)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    backdropFilter: "blur(4px)",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 20px",
    color: "#64748b",
  },
  loadingSpinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e2e8f0",
    borderLeft: "4px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  loadingText: {
    fontSize: "16px",
    color: "#64748b",
    fontWeight: "500",
  },
  welcomeSection: {
    marginBottom: "32px",
  },
  welcomeTitle: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#1e293b",
    margin: "0 0 8px 0",
    letterSpacing: "-0.5px",
  },
  welcomeSubtitle: {
    fontSize: "16px",
    color: "#64748b",
    margin: 0,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
    marginBottom: "40px",
  },
  statCard: {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    transition: "all 0.3s ease",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
  },
  statHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  statIcon: {
    fontSize: "24px",
    padding: "12px",
    borderRadius: "12px",
    color: "#ffffff",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  },
  statTrend: {
    fontSize: "14px",
    fontWeight: "600",
  },
  trendUp: {
    color: "#10b981",
  },
  trendDown: {
    color: "#ef4444",
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    margin: "0 0 8px 0",
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statValue: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "bold",
    color: "#1e293b",
    letterSpacing: "-1px",
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
    gap: "32px",
  },
  chartCard: {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  chartTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0,
  },
  chartLegend: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#64748b",
  },
  legendColor: {
    width: "12px",
    height: "12px",
    borderRadius: "2px",
  },
  chartActions: {
    display: "flex",
    gap: "8px",
  },
  chartActionButton: {
    padding: "6px 12px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#64748b",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  tooltip: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    color: "#1e293b",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    padding: "12px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
  },
  sectionTitle: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#1e293b",
    margin: "0 0 8px 0",
    letterSpacing: "-0.5px",
  },
  sectionSubtitle: {
    fontSize: "16px",
    color: "#64748b",
    margin: 0,
  },
  ordersStats: {
    display: "flex",
    gap: "16px",
  },
  orderStat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  orderStatLabel: {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "500",
  },
  orderStatValue: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#667eea",
  },
  tableContainer: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    backgroundColor: "#f8fafc",
  },
  th: {
    padding: "20px",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "600",
    color: "#475569",
    borderBottom: "1px solid #e2e8f0",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tableRow: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background-color 0.2s ease",
  },
  td: {
    padding: "20px",
    fontSize: "14px",
    color: "#475569",
  },
  phoneCell: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "500",
    color: "#1e293b",
  },
  phoneIcon: {
    fontSize: "16px",
    opacity: 0.7,
  },
  items: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  itemTag: {
    backgroundColor: "#f8fafc",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    border: "1px solid #e2e8f0",
    color: "#475569",
    fontWeight: "500",
    display: "inline-block",
    marginRight: "6px",
    marginBottom: "4px",
  },
  amount: {
    color: "#1e293b",
    fontSize: "16px",
  },
  statusBadge: {
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#667eea",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
};

// Add CSS animation for spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default App;
