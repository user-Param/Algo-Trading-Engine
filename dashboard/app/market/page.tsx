import DasboardGrid from "@/app/component/dashboardgrid";
import Card from "@/app/cards/card";
import {useState, useEffect } from 'react';
import { useDatafeed } from "@/app/lib/datafeed-context";
import Chart from "../cards/charts/chart";
import DashboardGrid from "@/app/component/dashboardgrid";
import Performance from "../cards/performance/performance";
import Latency from "../cards/latency/latency";
import Throughput from "../cards/throughput/throughput";
import Health from "../cards/health/health";
import Pipeline from "../cards/pipeline/pipeline";
import Pannel from "../cards/pannel/pannel";
import Network from "../cards/network/network";
import Event from "../cards/event/event";
import Session from "../cards/session/session";
import card from "@/app/cards/card";


interface CardItems {
	id: string;
	title: string;
	symbol?: string;
}


export default function Market(){

	const [cards, setCards] = useState<CardItems[]>([]);
	const {tickerData} = useDatafeed();
	const symbols = Object.keys(tickerData);

	useEffect(() => {
    // Chart cards for each symbol
    const chartCards: CardItems[] = symbols.map(symbol => ({
      id: `chart-${symbol}`,
      title: `Chart - ${symbol}`,
      symbol: symbol, // store symbol for rendering
    }));

    // Other static cards
    const otherCards: CardItems[] = [
      { id: 'performance', title: 'Performance' },
      { id: 'latency', title: 'Latency' },
      { id: 'throughput', title: 'Throughput' },
      { id: 'health', title: 'Health' },
      { id: 'pipeline', title: 'Pipeline' },
      { id: 'pannel', title: 'Pannel' },
      { id: 'network', title: 'Network' },
      { id: 'event', title: 'Event' },
      { id: 'session', title: 'Session' },
    ];

    setCards([...chartCards, ...otherCards]);
  }, [symbols]);
	
	const renderCardContent = (card: CardItems) => {
    if (card.id.startsWith('chart-')) {
      const symbol = card.symbol || card.id.replace('chart-', '');
      return <Chart selectedSymbol={symbol} onSymbolChange={() => {}} />;
    }

    // Other cards
    switch (card.id) {
      case 'performance': return <Performance />;
      case 'latency': return <Latency />;
      case 'throughput': return <Throughput />;
      case 'health': return <Health />;
      case 'pipeline': return <Pipeline />;
      case 'pannel': return <Pannel />;
      case 'network': return <Network />;
      case 'event': return <Event />;
      case 'session': return <Session />;
      default: return null;
    }
  };


	const renderView = () => {
		return(
			<DasboardGrid>
				{cards.map((card)=> (
					<Card
					key={card.id}
					id={card.id}
					title={card.title}
					>
						
							{renderCardContent(card)}
						
					</Card>
				))
				}
			</DasboardGrid>
		
		)
	}
	
	return(
		<>
			<div className="h-screen w-full">{renderView()}</div>
		</>
	)


};

