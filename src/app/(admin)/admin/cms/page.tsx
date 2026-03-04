'use client'

import { useState, useEffect, useTransition } from 'react'
import { getAllCmsPages, updateCmsSection } from '@/app/actions/cms'
import { CMS_PAGE_DEFINITIONS, CmsPage } from '@/types/cms'

export default function AdminCmsPage() {
  const [pages, setPages] = useState<CmsPage[]>([])
  const [activePage, setActivePage] = useState('homepage')
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => { getAllCmsPages().then(setPages) }, [])

  const pageDef = CMS_PAGE_DEFINITIONS.find(p => p.page_key === activePage)
  useEffect(() => {
    if (pageDef) setActiveSection(pageDef.sections[0]?.section_key ?? null)
  }, [activePage])

  useEffect(() => {
    if (!activeSection) return
    const row = pages.find(p => p.page_key === activePage && p.section_key === activeSection)
    if (row) {
      const flat: Record<string, string> = {}
      for (const [k, v] of Object.entries(row.content)) { if (typeof v === 'string') flat[k] = v }
      setEditValues(flat)
    }
  }, [activeSection, activePage, pages])

  const sectionDef = pageDef?.sections.find(s => s.section_key === activeSection)

  function handleSave() {
    if (!activeSection) return
    startTransition(async () => {
      await updateCmsSection(activePage, activeSection, editValues)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      const fresh = await getAllCmsPages()
      setPages(fresh)
    })
  }

  return (
    <div className="flex h-full min-h-screen bg-gray-950 text-gray-100">
      <aside className="w-52 border-r border-gray-800 p-4 flex flex-col gap-1 shrink-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Pages</p>
        {CMS_PAGE_DEFINITIONS.map(p => (
          <button key={p.page_key} onClick={() => setActivePage(p.page_key)} className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activePage === p.page_key ? 'bg-teal-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>{p.label}</button>
        ))}
      </aside>

      <aside className="w-52 border-r border-gray-800 p-4 flex flex-col gap-1 shrink-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Sections</p>
        {pageDef?.sections.map(s => (
          <button key={s.section_key} onClick={() => setActiveSection(s.section_key)} className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === s.section_key ? 'bg-teal-600/20 text-teal-400 border border-teal-600/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>{s.label}</button>
        ))}
      </aside>

      <main className="flex-1 p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{pageDef?.label}</h1>
          <p className="text-gray-400 text-sm mt-1">{sectionDef?.label}</p>
        </div>
        {sectionDef ? (
          <div className="space-y-6">
            {sectionDef.fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-300 mb-2">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea rows={4} value={editValues[field.key] ?? ''} onChange={e => setEditValues(v => ({ ...v, [field.key]: e.target.value }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-teal-500 resize-y" />
                ) : (
                  <input type="text" value={editValues[field.key] ?? ''} onChange={e => setEditValues(v => ({ ...v, [field.key]: e.target.value }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-teal-500" />
                )}
              </div>
            ))}
            <div className="flex items-center gap-4 pt-2">
              <button onClick={handleSave} disabled={isPending} className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">{isPending ? 'Saving…' : 'Save Changes'}</button>
              {saved && <span className="text-teal-400 text-sm font-medium">✓ Saved</span>}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Select a section to edit.</div>
        )}
      </main>
    </div>
  )
}
