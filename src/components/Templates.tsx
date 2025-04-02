"use client";

import "../styles/global.css";
import { useState, useEffect } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/TextArea";
import { Label } from "../components/ui/Label";
import { collection, addDoc, updateDoc, deleteDoc, getDocs, doc, getFirestore } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { withPermission } from "../components/WithPermission"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/AlertDialog";
import { initializeApp, type FirebaseApp } from "firebase/app";

interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  }  

interface Template {
  id: string;
  name: string;
  content: string;
}

interface ManageTemplatesProps {
  firebaseConfig: FirebaseConfig;
  companyId?: string;
  hasPermission?: (action: string) => boolean;
}

function ManageTemplates({ firebaseConfig, companyId, hasPermission }: ManageTemplatesProps)  {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const app: FirebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(app);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const templatesRef = collection(db, `companies/${companyId}/templates`);
    const snapshot = await getDocs(templatesRef);
    setTemplates(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Template));
  };

  const addTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      alert("Both fields are required!");
      return;
    }

    try {
      const templatesRef = collection(db, `companies/${companyId}/templates`);
      const newDocRef = await addDoc(templatesRef, {
        name: newTemplateName,
        content: newTemplateContent,
      });

      setTemplates([...templates, { id: newDocRef.id, name: newTemplateName, content: newTemplateContent }]);
      setNewTemplateName("");
      setNewTemplateContent("");
      setShowPopup(false);
    } catch (error) {
      console.error("Error adding template:", error);
    }
  };

  const updateTemplate = async (template: Template) => {
    try {
      const templateRef = doc(db, `companies/${companyId}/templates`, template.id);
      await updateDoc(templateRef, { name: template.name, content: template.content });

      setTemplates(templates.map((t) => (t.id === template.id ? template : t)));
      setEditingTemplate(null);
    } catch (error) {
      console.error("Error updating template:", error);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await deleteDoc(doc(db, `companies/${companyId}/templates`, id));
      setTemplates(templates.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const insertLabel = (label: string) => {
    setNewTemplateContent((prev) => prev + `{${label}}`);
  };

  return (
    <div className="min-h-screen bg-blue-100 dark:bg-gray-800 ">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => window.history.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Manage Templates</h1>
        {hasPermission && hasPermission('read') && (
        <Button onClick={() => setShowPopup(true)}>Add Template</Button>
        )}
    </header>
       {templates.map((template) => (
        <div key={template.id} className="p-4 border rounded-lg mb-4 text-gray-700 bg-white m-5">
          <div className="flex justify-between items-center">
            <span className="font-semibold">{template.name}</span>
            {hasPermission && hasPermission('ska') && (
            <div className="space-x-2">
              <Button onClick={() => setEditingTemplate(template)} size="sm" variant="secondary">Update</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="bg-red-500 hover:bg-red-600 text-white">
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Template</AlertDialogTitle>
                      <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the Template {template.name}.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                    <AlertDialogFooter>
                       <AlertDialogCancel>Cancel</AlertDialogCancel>
                       <AlertDialogAction onClick={() => deleteTemplate(template.id)}>delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            )}
          </div>
          {editingTemplate?.id === template.id ? (
            <div className="mt-2">
              <Input
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
              />
              <Textarea
                value={editingTemplate.content}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                className="mt-2"
              />
              <div className="flex justify-end space-x-2 mt-2">
                <Button onClick={() => setEditingTemplate(null)} variant="outline" size="sm">Cancel</Button>
                <Button onClick={() => updateTemplate(editingTemplate)} size="sm">Save</Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 mt-2">{template.content}</p>
          )}
        </div>
      ))}

      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white text-gray-700 p-6 rounded-lg shadow-lg w-[400px]">
            <h2 className="text-xl font-bold mb-4">New Template</h2>

            <Label htmlFor="new-template-name">New Template Name</Label>
            <Input
              id="new-template-name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Enter template name"
            />

            <Label htmlFor="new-template-content">New Template Content</Label>

            <div className="flex flex-wrap gap-2 mb-2">
              {["brand", "reference", "color", "gender", "price"].map((label) => (
                <Button key={label} onClick={() => insertLabel(label)} size="sm" variant="outline">
                  Insert {label}
                </Button>
              ))}
            </div>

            <Textarea
              id="new-template-content"
              value={newTemplateContent}
              onChange={(e) => setNewTemplateContent(e.target.value)}
              placeholder="Enter template content"
              rows={4}
            />

            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => setShowPopup(false)} variant="outline">Cancel</Button>
              <Button onClick={addTemplate}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default withPermission(ManageTemplates, ["ska"]);