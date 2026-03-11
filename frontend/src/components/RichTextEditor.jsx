import React, { useMemo, useRef, useState, useEffect } from 'react'
import ReactQuill, { Quill } from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import ImageResize from 'quill-image-resize-module-react'
import { attachmentsApi } from '../api'
import { Loader2 } from 'lucide-react'

// Register the image resize module
Quill.register('modules/imageResize', ImageResize)

export default function RichTextEditor({ value, onChange, placeholder, minHeight = '300px' }) {
    const quillRef = useRef(null)
    const [isUploading, setIsUploading] = useState(false)

    // 커스텀 이미지 핸들러 - 서버로 이미지를 즉시 업로드하고 에디터에 URL 삽입
    const imageHandler = () => {
        const input = document.createElement('input')
        input.setAttribute('type', 'file')
        input.setAttribute('accept', 'image/*')
        input.click()

        input.onchange = async () => {
            const file = input.files[0]
            if (!file) return

            if (file.size > 10 * 1024 * 1024) {
                alert('이미지 크기는 10MB 이하여야 합니다.')
                return
            }

            setIsUploading(true)
            try {
                const response = await attachmentsApi.uploadInlineImage(file)
                const imageUrl = response.data.url

                if (quillRef.current) {
                    const quill = quillRef.current.getEditor()
                    const range = quill.getSelection(true) // 커서 위치 가져오기

                    // 이미지 삽입
                    quill.insertEmbed(range.index, 'image', imageUrl)
                    // 커서를 이미지 다음으로 이동
                    quill.setSelection(range.index + 1)
                }
            } catch (error) {
                console.error('이미지 업로드 실패:', error)
                alert('이미지 업로드 중 오류가 발생했습니다.')
            } finally {
                setIsUploading(false)
            }
        }
    }

    // Quill 모듈 설정 (툴바 및 이미지 리사이즈)
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        },
        imageResize: {
            parchment: Quill.import('parchment'),
            modules: ['Resize', 'DisplaySize']
        }
    }), [])

    // Tailwind CSS와 호환되도록 스타일 커스텀
    return (
        <div className="relative">
            <div
                className={`quill-wrapper ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                style={{ minHeight }}
            >
                <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={value}
                    onChange={onChange}
                    modules={modules}
                    placeholder={placeholder || '내용을 자세히 적어주세요...'}
                    style={{ height: minHeight }}
                    className="bg-white dark:bg-gray-800 text-bnf-dark dark:text-gray-200 border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-bnf-blue/50 focus-within:border-bnf-blue rounded-lg"
                />
            </div>

            {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/80 rounded-lg z-10 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-bnf-blue/20">
                        <Loader2 className="w-8 h-8 animate-spin text-bnf-blue" />
                        <span className="text-sm font-medium text-bnf-blue">이미지 업로드 및 최적화 중...</span>
                    </div>
                </div>
            )}
        </div>
    )
}
