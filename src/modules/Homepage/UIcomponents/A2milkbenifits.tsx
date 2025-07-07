"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Heart, Shield, Zap, Droplets, Sparkles } from "lucide-react";
import Indraai from "@/modules/Homepage/images/indraai.png"
import Cows from "../images/cows.png"

interface A2MilkSectionProps {
  className?: string;
}

const A2MilkSection: React.FC<A2MilkSectionProps> = ({ className = "" }) => {
  const benefits = [
    {
      icon: Shield,
      title: "Strengthens Immunity",
      description: "Supports the body's natural defense system"
    },
    {
      icon: Zap,
      title: "High in Calcium & Protein",
      description: "Essential nutrients for strong bones and muscles"
    },
    {
      icon: CheckCircle,
      title: "Gentle on the Stomach",
      description: "Does not cause bloating or indigestion"
    },
    {
      icon: Heart,
      title: "Anti-Inflammatory Benefits",
      description: "Helps reduce internal inflammation"
    },
    {
      icon: Heart,
      title: "Supports Heart Health",
      description: "Promotes cardiovascular well-being"
    },
    {
      icon: Sparkles,
      title: "Nourishes the Skin",
      description: "Contributes to healthy, glowing skin"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
       }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const imageVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
    
      }
    }
  };

  return (
    <div className={`min-h-screen py-16 px-4 overflow-x-hidden ${className}`}>
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Main Section */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center " 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {/* Image Section */}
          <motion.div
            className="relative   "
            variants={imageVariants}
          >
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              <img
                src={Cows}
                alt="A2 Milk from Indian Desi Cows"
                className="w-full h-[400px] lg:h-[500px] object-cover"
              />
              {/* <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" /> */}
            </div>
            <motion.div
              className="absolute z-22 -bottom-4 -right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Droplets className="w-5 h-5 inline mr-2" />
              Pure A2 Milk
            </motion.div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            className="space-y-6 overflow-hidden"
            variants={textVariants}
          >
            <div>
              <Badge variant="outline" className="mb-4">
                Premium Quality
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
                A2 Milk
              </h1>
              <div className="space-y-4 text-gray-700 leading-relaxed text-justify">
                <p>
                  A2 milk contains the A2 beta-casein protein, which is naturally present in the milk of Indian-origin (Desi) cow breeds such as Gir, Kathiawadi, Dangi, Sahiwal, Hallikar, Konkan Gidda, and others. This protein makes A2 milk lighter on the stomach and easier to digest.
                </p>
                <p>
                  A2 milk is structurally closer to human mother's milk, making it not only more digestible but also suitable for young children.
                </p>
                <p>
                  In contrast, regular milk typically comes from hybrid breeds like Holstein Friesian and Jersey cows. While these breeds are preferred in commercial dairies due to their high milk yield, their milk contains A1 beta-casein, which may cause digestive discomfort—such as bloating, gas, or cramps—in some individuals.
                </p>
                <p>
                  For those sensitive to regular milk, A2 milk offers a gentler, nutrient-rich alternative that supports better digestion and overall well-being.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div
            className="text-center space-y-4"
            variants={itemVariants}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              A2 Milk Benefits
            </h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Discover the numerous health advantages of choosing A2 milk for you and your family
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <benefit.icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{benefit.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {benefit.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

 
     
      </div>
    </div>
  );
};

export default A2MilkSection;
