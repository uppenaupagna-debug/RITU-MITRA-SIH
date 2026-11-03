import React from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sprout,
  Wrench,
  BookOpen,
  GraduationCap,
  Phone,
} from "lucide-react";

import GovernmentSchemes from "./GovernmentSchemes";
import TechnicalSupport from "./TechnicalSupport";
import InputSuppliers from "./InputSuppliers";
import TrainingPrograms from "./TrainingPrograms";
import EmergencyContacts from "./EmergencyContacts";

export default function Resources() {
  const tabs = [
    { value: "schemes", label: "Schemes", icon: Sprout, component: <GovernmentSchemes /> },
    { value: "support", label: "Support", icon: Wrench, component: <TechnicalSupport /> },
    { value: "suppliers", label: "Suppliers", icon: BookOpen, component: <InputSuppliers /> },
    { value: "training", label: "Training", icon: GraduationCap, component: <TrainingPrograms /> },
    { value: "contacts", label: "Contacts", icon: Phone, component: <EmergencyContacts /> },
  ];

  const [activeTab, setActiveTab] = React.useState("schemes");
  const activeContent = tabs.find(t => t.value === activeTab)?.component;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 px-4 sm:px-6 lg:px-10 py-8">

      {/* Header */}
      <div className="text-center max-w-4xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
          🌿 Farming Resources Hub
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          One-stop guide to agricultural resources — explore schemes, training,
          support programs, and emergency help.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

        {/* Tabs Row */}
        <TabsList className="flex justify-center gap-4 bg-transparent mb-10">
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="
                flex items-center gap-2 px-5 py-2 rounded-full
                text-sm font-medium
                border
                bg-white dark:bg-neutral-900
                text-gray-700 dark:text-gray-300
                border-gray-300 dark:border-neutral-700
                hover:bg-green-50 dark:hover:bg-neutral-800
                data-[state=active]:bg-green-600
                data-[state=active]:text-white
                data-[state=active]:border-green-600
              "
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {activeContent}
        </div>

      </Tabs>
    </div>
  );
}