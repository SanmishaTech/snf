import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
function Whychoose() {
  return (
    <div className="w-full ">
      <div className="container mx-auto" >
        <div className="flex  py-2 mb-2  flex-col items-start">
          {/* <div>
            <Badge>Platform</Badge>
          </div> */}
          <div className="flex flex-col">
            <h2 className="text-primary text-xl md:text-3xl tracking-tighter lg:max-w-xl font-regular">
              Why choose Indraai
            </h2>

          </div>
          <div className="flex gap-2 pt-6 flex-col w-full">
            <div className="grid grid-cols-2 items-stretch lg:grid-cols-4 gap-4">
              <div className="flex flex-row gap-4 w-full items-start h-full min-h-[80px]">
                <Check className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-primary">
                  <p className="font-medium">100% Pure A2 Gir Cow Milk</p>
                  <p className="text-muted-foreground text-sm">
                    Naturally nutritious and easy to digest
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-4 items-start h-full min-h-[80px]">
                <Check className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-primary">
                  <p className="font-medium">Absolutely No Adulteration</p>
                  <p className="text-muted-foreground text-sm">
                    Only clean, untainted milk
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-4 items-start h-full min-h-[80px]">
                <Check className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-primary">
                  <p className="font-medium">Free from Antibiotics</p>
                  <p className="text-muted-foreground text-sm">
                    Safe and chemical-free
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-4 w-full items-start h-full min-h-[80px]">
                <Check className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-primary">
                  <p className="font-medium">No Artificial Insemination</p>
                  <p className="text-muted-foreground text-sm">
                    Ethical, traditional breeding practices
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-4 items-start h-full min-h-[80px]">
                <Check className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-primary">
                  <p className="font-medium">Cruelty-Free</p>
                  <p className="text-muted-foreground text-sm">
                    Respectful, humane treatment of animals
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-4 items-start h-full min-h-[80px]">
                <Check className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-primary">
                  <p className="font-medium">Hormone-Free</p>
                  <p className="text-muted-foreground text-sm">
                    No growth hormones or unnatural additives
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-4 items-start h-full min-h-[80px]">
                <Check className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-primary">
                  <p className="font-medium">Chemical-Free</p>
                  <p className="text-muted-foreground text-sm">
                    Zero exposure to harmful substances
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-4 items-start h-full min-h-[80px]">
                <Check className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-primary">
                  <p className="font-medium">No Steroids</p>
                  <p className="text-muted-foreground text-sm">
                    Clean, unmodified milk
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-4 items-start h-full min-h-[80px]">
                <Check className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-primary">
                  <p className="font-medium">Free-Grazing Cows</p>
                  <p className="text-muted-foreground text-sm">
                    Open pasture grazing for natural well-being
                  </p>
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
