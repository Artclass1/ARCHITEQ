import React, { useState, useRef, useEffect } from 'react';
import { generatePlan, generateImage, chatAndUpdatePlan, type ArchitecturePlan } from './services/gemini';
import { ArchitecturePdf } from './components/PdfDocument';
import { pdf } from '@react-pdf/renderer';
import { Loader2, Download, Sparkles, Building2, Layers, Hammer, ArrowRight, MessageSquare, Send, Ruler, DollarSign, MapPin, Clock, Trash2, ImagePlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<ArchitecturePlan | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loadingStep, setLoadingStep] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string, previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const chatFormRef = useRef<HTMLFormElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isChatting]);

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleDownloadPdf = async () => {
    if (!plan) return;
    setIsDownloadingPdf(true);
    try {
      const safeTitle = plan.title.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase();
      const fileName = `${safeTitle}-plan.pdf`;
      
      const blob = await pdf(<ArchitecturePdf plan={plan} images={images} />).toBlob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedImage({ 
        data: base64String, 
        mimeType: file.type, 
        previewUrl: URL.createObjectURL(file) 
      });
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.previewUrl);
      setSelectedImage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !selectedImage) return;

    setIsGenerating(true);
    setError('');
    setPlan(null);
    setImages([]);
    setChatHistory([]);

    try {
      setLoadingStep('Conceptualizing architecture...');
      const generatedPlan = await generatePlan(prompt, selectedImage || undefined);
      setPlan(generatedPlan);

      setLoadingStep('Rendering architectural visualizations...');
      const imagePromises = generatedPlan.imagePrompts.slice(0, 3).map(prompt => generateImage(prompt));
      const generatedImages = await Promise.all(imagePromises);
      setImages(prev => [...prev, ...generatedImages]);

      setLoadingStep('');
      setChatHistory([{ role: 'model', text: 'I have generated the initial architectural plan. You can ask me to add dimensions, estimate costs, suggest local resources, plan the execution strategy, or generate more images.' }]);
    } catch (err) {
      console.error(err);
      setError('Failed to generate the architectural plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !plan) return;

    const userMsg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);
    setError('');

    try {
      const response = await chatAndUpdatePlan(chatHistory, plan, userMsg);
      
      setPlan(response.updatedPlan);
      setChatHistory(prev => [...prev, { role: 'model', text: response.aiMessage }]);

      if (response.newImagePrompts && response.newImagePrompts.length > 0) {
        setChatHistory(prev => [...prev, { role: 'model', text: `Generating ${response.newImagePrompts.length} new image(s)...` }]);
        
        const newImagePromises = response.newImagePrompts.map(prompt => 
          generateImage(prompt).catch(err => {
            console.error('Failed to generate an image:', err);
            return null;
          })
        );
        
        const newImages = (await Promise.all(newImagePromises)).filter((img): img is string => img !== null);
        if (newImages.length > 0) {
          setImages(prev => [...prev, ...newImages]);
        }
        
        setChatHistory(prev => [...prev, { role: 'model', text: `Finished generating new images.` }]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update the plan. Please try again.');
    } finally {
      setIsChatting(false);
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
          {plan && (
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-full hover:bg-white transition-colors disabled:opacity-50"
            >
              {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isDownloadingPdf ? 'Preparing PDF...' : 'Download Plan'}
            </button>
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

            <form ref={formRef} onSubmit={handleGenerate} className="relative max-w-2xl mx-auto">
              <div className="absolute top-4 left-4 flex items-center pointer-events-none">
                <Sparkles className="w-5 h-5 text-zinc-500" />
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
                placeholder="e.g., A minimalist concrete cliffside retreat in Big Sur. I want it to have large glass windows, a green roof, and use locally sourced timber..."
                className="w-full bg-zinc-900/50 border border-white/10 rounded-3xl py-4 pl-12 pr-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-all resize-none min-h-[140px]"
                required={!selectedImage}
              />
              
              {selectedImage && (
                <div className="absolute bottom-16 left-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/20">
                    <img src={selectedImage.previewUrl} alt="Upload preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={removeSelectedImage}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-red-500/80 text-white rounded-full transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              <div className="absolute bottom-3 left-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-full transition-colors"
                  title="Upload sketch or photo"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute bottom-3 right-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-zinc-100 text-zinc-900 rounded-full font-medium text-sm hover:bg-white transition-colors flex items-center gap-2"
                >
                  Generate <ArrowRight className="w-4 h-4" />
                </button>
              </div>
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
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 group">
                  <img src={images[0]} alt="Hero rendering" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(0)}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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

                {plan.dimensions && plan.dimensions.length > 0 && (
                  <section>
                    <h3 className="text-2xl font-serif text-zinc-100 mb-6 flex items-center gap-3">
                      <Ruler className="w-5 h-5 text-zinc-500" /> Dimensions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {plan.dimensions.map((dim, i) => (
                        <div key={i} className="p-4 rounded-xl bg-zinc-900/20 border border-white/5 flex justify-between items-center">
                          <span className="text-zinc-300 text-sm font-medium">{dim.area}</span>
                          <span className="text-zinc-500 text-sm font-mono">{dim.size}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {plan.executionStrategy && (
                  <section>
                    <h3 className="text-2xl font-serif text-zinc-100 mb-6 flex items-center gap-3">
                      <Clock className="w-5 h-5 text-zinc-500" /> Execution Strategy
                    </h3>
                    <div className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5">
                      <p className="text-zinc-400 leading-relaxed text-sm">
                        {plan.executionStrategy}
                      </p>
                    </div>
                  </section>
                )}

                {images[1] && (
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 group">
                    <img src={images[1]} alt="Interior rendering" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(1)}
                      className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

                {plan.estimatedCost && plan.estimatedCost.length > 0 && (
                  <section>
                    <h3 className="text-2xl font-serif text-zinc-100 mb-6 flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-zinc-500" /> Estimated Costing
                    </h3>
                    <div className="space-y-3">
                      {plan.estimatedCost.map((cost, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-zinc-400">{cost.category}</span>
                          <span className="text-zinc-200 font-mono">{cost.cost}</span>
                        </div>
                      ))}
                      {plan.totalEstimatedCost && (
                        <div className="pt-3 mt-3 border-t border-white/10 flex justify-between items-center font-medium">
                          <span className="text-zinc-300">Total Estimate</span>
                          <span className="text-zinc-100 font-mono">{plan.totalEstimatedCost}</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {plan.localResources && plan.localResources.length > 0 && (
                  <section>
                    <h3 className="text-2xl font-serif text-zinc-100 mb-6 flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-zinc-500" /> Local Resources
                    </h3>
                    <ul className="space-y-2">
                      {plan.localResources.map((resource, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                          <span className="text-zinc-600 mt-0.5">•</span>
                          {resource}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

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

            {/* Additional Images Grid */}
            {images.length > 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {images.slice(2).map((img, i) => (
                  <div key={i + 2} className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 group">
                    <img src={img} alt={`Additional rendering ${i + 3}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(i + 2)}
                      className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Chat Interface */}
            <div className="mt-24 max-w-3xl mx-auto border border-white/10 rounded-2xl bg-zinc-900/30 overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b border-white/10 bg-zinc-900/50 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-zinc-400" />
                <h3 className="font-medium text-zinc-200">Refine Project</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-zinc-100 text-zinc-900 rounded-br-sm' 
                        : 'bg-zinc-800/50 text-zinc-300 border border-white/5 rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800/50 text-zinc-300 border border-white/5 p-4 rounded-2xl rounded-bl-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Architect is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form ref={chatFormRef} onSubmit={handleChatSubmit} className="p-4 border-t border-white/10 bg-zinc-900/50">
                <div className="relative">
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        chatFormRef.current?.requestSubmit();
                      }
                    }}
                    placeholder="Ask to add dimensions, estimate costs, or generate new views..."
                    disabled={isChatting}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-all disabled:opacity-50 resize-none min-h-[80px]"
                  />
                  <button
                    type="submit"
                    disabled={isChatting || !chatMessage.trim()}
                    className="absolute bottom-2 right-2 w-9 h-9 flex items-center justify-center bg-zinc-100 text-zinc-900 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
