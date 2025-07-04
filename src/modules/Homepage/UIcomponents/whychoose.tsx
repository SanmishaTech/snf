import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function Whychoose() {
  return (
    <div className="w-full ">
      <div className="container mx-auto">
        <div className="flex gap-4 py-10 mb-10 lg:py-10 flex-col items-start">
          {/* <div>
            <Badge>Platform</Badge>
          </div> */}
          <div className="flex gap-2 flex-col">
            <h2 className="text-xl md:text-3xl tracking-tighter lg:max-w-xl font-regular">
             Why choose <span className="text-primary">Indraai</span>
            </h2>
          
          </div>
          <div className="flex gap-10 pt-12 flex-col w-full">
            <div className="grid grid-cols-2 items-start lg:grid-cols-3 gap-10">
              <div className="flex flex-row gap-6 w-full items-start">
                <Check className="w-4 h-4 mt-2 text-primary" />
                <div className="flex flex-col gap-1">
                  <p>100% Pure A2 Gir Cow Milk</p>
                  <p className="text-muted-foreground text-sm">
                  Naturally nutritious and easy to digest                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-6 items-start">
                <Check className="w-4 h-4 mt-2 text-primary" />
                <div className="flex flex-col gap-1">
                  <p>Absolutely No Adulteration</p>
                  <p className="text-muted-foreground text-sm">
                  Only clean, untainted milk
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-6 items-start">
                <Check className="w-4 h-4 mt-2 text-primary" />
                <div className="flex flex-col gap-1">
                  <p>Free from Antibiotics</p>
                  <p className="text-muted-foreground text-sm">
                  Safe and chemical-free
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-6 w-full items-start">
                <Check className="w-4 h-4 mt-2 text-primary" />
                <div className="flex flex-col gap-1">
                  <p>No Artificial Insemination</p>
                  <p className="text-muted-foreground text-sm">
                  Ethical, traditional breeding practices                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-6 items-start">
                <Check className="w-4 h-4 mt-2 text-primary" />
                <div className="flex flex-col gap-1">
                  <p>Cruelty-Free</p>
                  <p className="text-muted-foreground text-sm">
                  Respectful, humane treatment of animals                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-6 items-start">
                <Check className="w-4 h-4 mt-2 text-primary" />
                <div className="flex flex-col gap-1">
                  <p>Hormone-Free</p>
                  <p className="text-muted-foreground text-sm">
                  No growth hormones or unnatural additives                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-6 items-start">
                <Check className="w-4 h-4 mt-2 text-primary" />
                <div className="flex flex-col gap-1">
                  <p>Chemical-Free</p>
                  <p className="text-muted-foreground text-sm">
                  Zero exposure to harmful substances  
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-6 items-start">
                <Check className="w-4 h-4 mt-2 text-primary" />
                <div className="flex flex-col gap-1">
                  <p>No Steroids</p>
                  <p className="text-muted-foreground text-sm">
                  Clean, unmodified milk                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-6 items-start">
                <Check className="w-4 h-4 mt-2 text-primary" />
                <div className="flex flex-col gap-1">
                  <p>Free-Grazing Cows</p>
                  <p className="text-muted-foreground text-sm">
                  Open pasture grazing for natural well-being                 </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Whychoose };
