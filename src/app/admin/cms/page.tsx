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
    } else {
      setEditValues({})
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
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-brand-charcoal mb-1">Page Editor</h1>
      <p className="text-brand-gray-500 text-sm mb-8">Edit marketing page content</p>

      {/* Page tabs */}
      <div className="flex gap-2 mb-6">
        {CMS_PAGE_DEFINITIONS.map(p => (
          <button
            key={p.page_key}
            onClick={() => setActivePage(p.page_key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activePage === p.page_key
                ? 'bg-brand-charcoal text-white'
                : 'bg-white text-brand-gray-500 border border-brand-gray-200 hover:border-brand-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Section tabs */}
      {pageDef && (
        <div className="flex gap-2 mb-6 border-b border-brand-gray-200 pb-4">
          {pageDef.sections.map(s => (
            <button
              key={s.section_key}
              onClick={() => setActiveSection(s.section_key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeSection === s.section_key
                  ? 'bg-brand-orange/10 text-brand-orange border border-brand-orange/30'
                  : 'text-brand-gray-500 hover:text-brand-charcoal'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Editor */}
      {sectionDef ? (
        <div className="bg-white rounded-xl border border-brand-gray-200 p-6">
          <h2 className="text-lg font-semibold text-brand-charcoal mb-1">{sectionDef.label}</h2>
          <p className="text-brand-gray-400 text-xs mb-6">{pageDef?.label} &rsaquo; {sectionDef.label}</p>

          <div className="space-y-5">
            {sectionDef.fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-brand-charcoal mb-1.5">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={editValues[field.key] ?? ''}
                    onChange={e => setEditValues(v => ({ ...v, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full border border-brand-gray-200 rounded-lg px-4 py-3 text-brand-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange resize-y bg-brand-gray-100"
                  />
                ) : (
                  <input
                    type={field.type === 'url' ? 'url' : 'text'}
                    value={editValues[field.key] ?? ''}
                    onChange={e => setEditValues(v => ({ ...v, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full border border-brand-gray-200 rounded-lg px-4 py-3 text-brand-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange bg-brand-gray-100"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-brand-gray-200">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && <span className="text-brand-success-dark text-sm font-medium">Saved</span>}
          </div>
        </div>
      ) : (
        <div className="text-brand-gray-400 text-sm bg-white rounded-xl border border-brand-gray-200 p-8 text-center">
          Select a section to edit.
        </div>
      )}
    </div>
  )
}
