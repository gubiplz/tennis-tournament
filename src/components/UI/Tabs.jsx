import { useState, useRef, useEffect, useCallback } from 'react';

export function Tabs({ tabs, activeTab, onTabChange }) {
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    const activeTabEl = tabsRef.current[activeIndex];

    if (activeTabEl && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = activeTabEl.getBoundingClientRect();

      setIndicatorStyle({
        width: tabRect.width * 0.6,
        left: tabRect.left - containerRect.left + (tabRect.width * 0.2),
      });
    }
  }, [activeTab, tabs]);

  const handleKeyDown = useCallback((e) => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    let newIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      newIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = tabs.length - 1;
    } else {
      return;
    }

    onTabChange(tabs[newIndex].id);
    tabsRef.current[newIndex]?.focus();
  }, [activeTab, tabs, onTabChange]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Nawigacja turnieju"
      className="flex bg-white/80 backdrop-blur-lg sticky top-0 z-10 relative border-t border-gray-100"
      onKeyDown={handleKeyDown}
    >
      {/* Animated indicator */}
      <div
        className="absolute bottom-0 h-[3px] bg-gradient-to-r from-tennis-500 to-tennis-400 rounded-t-full transition-all duration-300 ease-out"
        style={indicatorStyle}
        aria-hidden="true"
      />

      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={el => tabsRef.current[index] = el}
          onClick={() => onTabChange(tab.id)}
          className={`tab group ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
        >
          <span
            className={`tab-icon transition-all duration-300 ${
              activeTab === tab.id
                ? 'transform scale-110'
                : 'group-hover:scale-105 group-active:scale-95'
            }`}
            aria-hidden="true"
          >
            {tab.icon}
          </span>
          <span className={`text-xs font-medium transition-all duration-300 ${
            activeTab === tab.id ? 'text-tennis-700' : 'text-gray-600'
          }`}>
            {tab.label}
          </span>

          {/* Ripple effect on tap */}
          <span className="absolute inset-0 overflow-hidden rounded-lg" aria-hidden="true">
            <span className="absolute inset-0 bg-tennis-500/10 opacity-0 group-active:opacity-100 transition-opacity duration-150" />
          </span>
        </button>
      ))}
    </div>
  );
}
