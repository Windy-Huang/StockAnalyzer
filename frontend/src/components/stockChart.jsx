import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
);

function StockChart({ datasets }) {
    const options = {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            x: {
                type: 'time',
                time: { unit: 'day' },
                title: { display: true, text: 'Date', color: '#ffffff' },
                ticks: { color: '#ffffff' },
                grid: { color: '#404040' }
            },
            y: {
                title: { display: true, text: 'Price (USD)', color: '#ffffff' },
                ticks: { color: '#ffffff' },
                grid: { color: '#404040' }
            }
        },
        plugins: {
            legend: { labels: { color: '#ffffff' } }
        }
    };

    return <Line data={{ datasets }} options={options} />;
}

export default StockChart;