import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { RotateCcw, SquareStack, Shuffle } from 'lucide-react';

interface Flashcard {
  question: string;
  answer: string;
}
interface FlashcardsViewerProps {
  title: string;
  data?: Flashcard[];
}

export default function FlashcardsViewer({ title, data }: FlashcardsViewerProps) {
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [order, setOrder] = useState<number[]>([]);

  const rawCards: Flashcard[] = data && data.length > 0 ? data : [
    { question: 'No flashcard data found', answer: 'Please upload a PDF to generate flashcards.' },
  ];

  const displayOrder = order.length === rawCards.length ? order : rawCards.map((_, i) => i);
  const cards = displayOrder.map(i => rawCards[i]);

  const toggleFlip = (index: number) => {
    setFlippedCards(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const shuffle = () => {
    const shuffled = [...rawCards.map((_, i) => i)].sort(() => Math.random() - 0.5);
    setOrder(shuffled);
    setFlippedCards({});
  };

  const reset = () => {
    setOrder([]);
    setFlippedCards({});
  };

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardHeader className="sm:space-y-4 space-y-2 px-0 py-2 sm:py-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 sm:text-xl text-sm font-semibold uppercase truncate">
            <div className="p-1.5 sm:p-2 bg-pink-50 dark:bg-pink-900/30 rounded-lg sm:rounded-xl flex-shrink-0">
              <SquareStack className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
            </div>
            <span>Flashcards</span>
            <span className="text-[10px] sm:text-xs font-normal text-gray-500 dark:text-gray-400 normal-case tracking-normal ml-1 flex-shrink-0">
              — {cards.length} card{cards.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={shuffle} className="rounded-xl h-9">
              <Shuffle className="h-4 w-4 mr-2" /> Shuffle
            </Button>
            <Button variant="outline" size="sm" onClick={reset} className="rounded-xl h-9">
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>
        </div>

        <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 font-medium">
          Click any card to reveal its answer. Review all generated cards below.
        </p>

        <div className="flex sm:hidden items-center gap-2 w-full mt-2">
          <Button variant="outline" size="sm" onClick={shuffle} className="flex-1 rounded-lg h-8 text-[11px] font-semibold">
            <Shuffle className="h-3.5 w-3.5 mr-1.5" /> Shuffle
          </Button>
          <Button variant="outline" size="sm" onClick={reset} className="flex-1 rounded-lg h-8 text-[11px] font-semibold">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <ScrollArea className="h-[650px] w-full pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
            {cards.map((current, i) => {
              const isFlipped = flippedCards[i] || false;

              return (
                <div
                  key={i}
                  className="min-h-[260px] cursor-pointer select-none group perspective-1000"
                  onClick={() => toggleFlip(i)}
                >
                  <div className={`relative w-full h-full rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${isFlipped
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-300 dark:border-emerald-700'
                    : 'bg-gradient-to-br from-pink-50 to-indigo-50 dark:from-pink-950/30 dark:to-indigo-950/30 border-pink-200 dark:border-pink-800'
                    } flex flex-col justify-between`}>

                    <div className="space-y-4">
                      {isFlipped ? (
                        <>
                          <div>
                            <span className="inline-block px-3 py-1 bg-emerald-500 text-white text-[10px] font-semibold rounded-full tracking-wider mb-3">
                              ANSWER
                            </span>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                              {current.answer}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="inline-block px-3 py-1 bg-pink-500 text-white text-[10px] font-semibold rounded-full tracking-wider mb-3">
                              QUESTION {i + 1}
                            </span>
                            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                              {current.question}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className={`pt-4 mt-4 border-t-2 ${isFlipped ? 'border-emerald-200 dark:border-emerald-800' : 'border-pink-100 dark:border-pink-900'}`}>
                      <p className={`text-xs text-center font-medium ${isFlipped ? 'text-emerald-500' : 'text-pink-400 dark:text-pink-500'}`}>
                        {isFlipped ? '👆 Click to see question' : '👆 Click to reveal answer'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}