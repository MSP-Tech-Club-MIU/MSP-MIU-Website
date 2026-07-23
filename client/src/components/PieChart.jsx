import React from 'react';

const PieChart = ({ data, title, size = 200, theme = 'light' }) => {
  const isAdmin = theme === 'admin';

  if (!data || data.length === 0) {
    return isAdmin
      ? <div className="RegAdmin__pieEmpty">No data available</div>
      : (
        <div style={{
          textAlign: 'center',
          margin: '20px',
          fontFamily: 'Arial, sans-serif',
          color: '#666'
        }}>
          No data available
        </div>
      );
  }

  let cumulativePercentage = 0;

  if (isAdmin) {
    return (
      <div className="RegAdmin__pie">
        <h3 className="RegAdmin__pieTitle">{title}</h3>
        <div style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            {data.map((item, index) => {
              const circumference = 2 * Math.PI * (size / 2 - 10);
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -(cumulativePercentage / 100) * circumference;
              cumulativePercentage += item.percentage;
              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={size / 2 - 10}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="18"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
              );
            })}
          </svg>
          <div className="RegAdmin__pieCenter">
            {data.reduce((sum, item) => sum + item.count, 0)}
          </div>
        </div>
        <div className="RegAdmin__pieLegend">
          {data.map((item, index) => (
            <div key={index} className="RegAdmin__pieLegendItem">
              <span className="RegAdmin__pieSwatch" style={{ backgroundColor: item.color }} />
              <span>{item.label}: {item.count} ({item.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      textAlign: 'center',
      margin: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h3 style={{
        marginBottom: '15px',
        color: '#395a7f',
        fontSize: '16px',
        fontWeight: '600',
        fontFamily: 'Arial, sans-serif'
      }}>{title}</h3>

      <div style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {data.map((item, index) => {
            const circumference = 2 * Math.PI * (size / 2 - 10);
            const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -(cumulativePercentage / 100) * circumference;
            cumulativePercentage += item.percentage;
            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={size / 2 - 10}
                fill="none"
                stroke={item.color}
                strokeWidth="18"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'all 0.3s ease',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}
              />
            );
          })}
        </svg>

        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '18px',
          fontWeight: '700',
          color: '#395a7f',
          fontFamily: 'Arial, sans-serif'
        }}>
          {data.reduce((sum, item) => sum + item.count, 0)}
        </div>
      </div>

      <div style={{
        marginTop: '15px',
        textAlign: 'left',
        maxWidth: '250px'
      }}>
        {data.map((item, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            margin: '8px 0',
            padding: '4px 0'
          }}>
            <div style={{
              width: '14px',
              height: '14px',
              backgroundColor: item.color,
              borderRadius: '3px',
              marginRight: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
            <span style={{
              fontSize: '13px',
              fontFamily: 'Arial, sans-serif',
              color: '#333',
              fontWeight: '500'
            }}>
              {item.label}: {item.count} ({item.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;
