import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Upload, Link2, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Progress } from '../components/ui/progress';

export function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Check,
      title: 'Vítejte v HypoManažeru!',
      description: 'Za chvíli zpracujete svůj první případ.',
      visual: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop',
    },
    {
      icon: Upload,
      title: 'Nahrajte první dokument',
      description: 'Nahrajte občanku, daňové přiznání nebo bankovní výpis. AI z něj vytáhne všechna data.',
      action: 'Nahrát dokument',
      visual: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    },
    {
      icon: Link2,
      title: 'Pozvěte klienta',
      description: 'Vygenerujte odkaz a pošlete ho klientovi. Klient nahraje dokumenty sám z mobilu.',
      action: 'Vytvořit odkaz',
      visual: 'https://images.unsplash.com/photo-1556742400-b5a32c13b8ee?w=600&h=400&fit=crop',
    },
    {
      icon: Check,
      title: 'Hotovo!',
      description: 'Všechno je připravené. Váš plán Starter obsahuje 30 stránek ke zpracování měsíčně zdarma.',
      action: 'Přejít do aplikace',
      visual: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
    },
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // V reálné aplikaci by se přesměrovalo do dashboardu
      navigate('/');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">
              Krok {currentStep + 1} z {steps.length}
            </span>
            <button onClick={handleSkip} className="text-sm text-gray-600 hover:text-gray-900">
              Přeskočit
            </button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="border-2 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Content Side */}
              <div className="p-12 flex flex-col justify-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <currentStepData.icon className="w-8 h-8 text-blue-600" />
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {currentStepData.title}
                </h1>
                <p className="text-xl text-gray-600 mb-8">{currentStepData.description}</p>

                <div className="flex gap-4">
                  {currentStep > 0 && (
                    <Button variant="outline" onClick={handleBack}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Zpět
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                  >
                    {currentStepData.action || 'Další'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                {/* Step Indicators */}
                <div className="flex gap-2 mt-8">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'bg-blue-600 w-8'
                          : index < currentStep
                          ? 'bg-blue-300 w-2'
                          : 'bg-gray-300 w-2'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Visual Side */}
              <div className="hidden lg:block bg-gradient-to-br from-blue-100 to-indigo-100 p-12">
                <div className="h-full flex items-center justify-center">
                  <img
                    src={currentStepData.visual}
                    alt={currentStepData.title}
                    className="rounded-2xl shadow-2xl w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-gray-700">✨ AI extrakce dokumentů</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-gray-700">📊 Přehledný dashboard</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-gray-700">🔗 Klientský portál</p>
          </div>
        </div>
      </div>
    </div>
  );
}