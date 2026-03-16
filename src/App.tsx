import React, { useState } from 'react';
import { generatePlan, generateImage, type ArchitecturePlan } from './services/gemini';
import { ArchitecturePdf } from './components/PdfDocument';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Loader2, Download, Sparkles, Building2, Layers, Hammer, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<ArchitecturePlan | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loadingStep, setLoadingStep] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError('');
    setPlan(null);
    setImages([]);

    try {
      setLoadingStep('Conceptualizing architecture...');
      const generatedPlan = await generatePlan(prompt);
      setPlan(generatedPlan);

      setLoadingStep('Rendering architectural visualizations (1/3)...');
      const img1 = await generateImage(generatedPlan.imagePrompts[0]);
      setImages(prev => [...prev, img1]);

      setLoadingStep('Rendering architectural visualizations (2/3)...');
      const img2 = await generateImage(generatedPlan.imagePrompts[1]);
      setImages(prev => [...prev, img2]);

      setLoadingStep('Rendering architectural visualizations (3/3)...');
      const img3 = await generateImage(generatedPlan.imagePrompts[2]);
      setImages(prev => [...prev, img3]);

      setLoadingStep('');
    } catch (err) {
      console.error(err);
      setError('Failed to generate the architectural plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-zinc-800">
      {/* Header */}
      <header className="fixed top-0 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-zinc-100" />
            <span className="font-serif text-lg font-medium tracking-wide text-zinc-100 uppercase">ArchiGen</span>
          </div>
          {plan && images.length === 3 && (
            <PDFDownloadLink
              document={<ArchitecturePdf plan={plan} images={images} />}
              fileName={`${plan.title.replace(/\s+/g, '-').toLowerCase()}-plan.pdf`}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-full hover:bg-white transition-colors"
            >
              {({ loading }) => (
                <>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {loading ? 'Preparing PDF...' : 'Download Plan'}
                </>
              )}
            </PDFDownloadLink>
          )}
        </div>
      </header>

      <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* Hero Section */}
        {!plan && !isGenerating && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center mt-20"
          >
            <h1 className="text-5xl md:text-7xl font-serif font-light text-zinc-100 mb-6 tracking-tight leading-tight">
              Concept to <br /> Deployable Plan
            </h1>
            <p className="text-zinc-400 text-lg mb-12 font-light max-w-xl mx-auto leading-relaxed">
              Describe your architectural vision. Our AI will generate a comprehensive, professional plan and photorealistic renderings.
            </p>

            <form onSubmit={handleGenerate} className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Sparkles className="w-5 h-5 text-zinc-500" />
              </div>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A minimalist concrete cliffside retreat in Big Sur..."
                className="w-full bg-zinc-900/50 border border-white/10 rounded-full py-4 pl-12 pr-32 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-all"
                required
              />
              <button
                type="submit"
                className="absolute inset-y-1.5 right-1.5 px-6 bg-zinc-100 text-zinc-900 rounded-full font-medium text-sm hover:bg-white transition-colors flex items-center gap-2"
              >
                Generate <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32"
          >
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-6" />
            <p className="text-zinc-300 font-medium tracking-wide">{loadingStep}</p>
            <p className="text-zinc-500 text-sm mt-2">This may take a minute for high-quality renderings.</p>
          </motion.div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mt-8 p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Results */}
        {plan && !isGenerating && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-24"
          >
            {/* Title & Hero Image */}
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="text-sm font-semibold tracking-[0.2em] text-zinc-500 uppercase mb-4">Project Proposal</h2>
              <h1 className="text-4xl md:text-6xl font-serif text-zinc-100 mb-12">{plan.title}</h1>
              
              {images[0] && (
                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-900">
                  <img src={images[0]} alt="Hero rendering" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              {/* Left Column: Overview & Layout */}
              <div className="lg:col-span-7 space-y-16">
                <section>
                  <h3 className="text-2xl font-serif text-zinc-100 mb-6 flex items-center gap-3">
                    <span className="w-8 h-[1px] bg-zinc-700"></span> Concept Overview
                  </h3>
                  <p className="text-zinc-400 leading-relaxed text-lg font-light">
                    {plan.conceptOverview}
                  </p>
                </section>

                <section>
                  <h3 className="text-2xl font-serif text-zinc-100 mb-6 flex items-center gap-3">
                    <span className="w-8 h-[1px] bg-zinc-700"></span> Spatial Layout
                  </h3>
                  <div className="space-y-6">
                    {plan.spatialLayout.map((space, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5">
                        <h4 className="text-zinc-100 font-medium mb-2">{space.area}</h4>
                        <p className="text-zinc-400 text-sm leading-relaxed">{space.description}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {images[1] && (
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-900">
                    <img src={images[1]} alt="Interior rendering" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Right Column: Materials & Phases */}
              <div className="lg:col-span-5 space-y-16">
                <section>
                  <h3 className="text-2xl font-serif text-zinc-100 mb-6 flex items-center gap-3">
                    <Layers className="w-5 h-5 text-zinc-500" /> Material Palette
                  </h3>
                  <div className="space-y-4">
                    {plan.materialPalette.map((mat, i) => (
                      <div key={i} className="border-l-2 border-zinc-800 pl-4 py-1">
                        <h4 className="text-zinc-200 font-medium text-sm mb-1">{mat.name}</h4>
                        <p className="text-zinc-500 text-sm">{mat.description}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-2xl font-serif text-zinc-100 mb-6 flex items-center gap-3">
                    <Hammer className="w-5 h-5 text-zinc-500" /> Construction Phases
                  </h3>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
                    {plan.constructionPhases.map((phase, i) => (
                      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500 text-[10px] font-medium shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                          {i + 1}
                        </div>
                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-white/5 bg-zinc-900/20">
                          <h4 className="text-zinc-200 font-medium text-sm mb-1">{phase.phase}</h4>
                          <p className="text-zinc-500 text-xs leading-relaxed">{phase.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-2xl font-serif text-zinc-100 mb-6 flex items-center gap-3">
                    <span className="w-8 h-[1px] bg-zinc-700"></span> Design Principles
                  </h3>
                  <ul className="space-y-3">
                    {plan.designPrinciples.map((principle, i) => (
                      <li key={i} className="flex items-start gap-3 text-zinc-400 text-sm">
                        <span className="text-zinc-600 mt-0.5">•</span>
                        {principle}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>

            {images[2] && (
              <div className="aspect-[21/9] w-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-900">
                <img src={images[2]} alt="Detail rendering" className="w-full h-full object-cover" />
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
