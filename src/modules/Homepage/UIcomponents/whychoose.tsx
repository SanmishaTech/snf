import { Droplet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
function Whychoose() {
  return (
    <div className="w-full bg-primary/20 rounded-lg">
      <div className="container mx-auto" >
        <div className="flex  p-4 mb-2  flex-col items-start">
          {/* <div>
            <Badge>Platform</Badge>
          </div> */}
          <div className="flex flex-col">
            <h2 className="p-2 ml-4 text-secondary text-xl md:text-3xl tracking-tighter lg:max-w-xl font-regular">
              Why choose Indraai
            </h2>

          </div>
          <div className="flex gap-2 pt-6 flex-col w-full">
            <div className="grid grid-cols-1 items-stretch lg:grid-cols-4 gap-4 overflow-x-auto">
              <div className="flex flex-row gap-4 min-w-full items-start h-full  min-h-[80px] p-4 mr-2 bg-white rounded-lg">
                <Droplet className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-secondary rounded">
                  <p className="font-medium">100% Pure A2 Gir Cow Milk</p>
                  <p className="text-muted-foreground text-sm text-wrap">
                    Naturally nutritious and easy to digest
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-4 min-w-full items-start h-full  min-h-[80px]  p-4 mr-2 bg-white rounded-lg">
                <Droplet className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-secondary">
                  <p className="font-medium">Absolutely No Adulteration</p>
                  <p className="text-muted-foreground text-sm">
                    Only clean, untainted milk
                  </p>
                </div>
              </div>
              <div className="flex flex-row w-full gap-4 items-start h-full  min-h-[80px]  p-4  mr-2 bg-white rounded-lg">
                <Droplet className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-secondary">
                  <p className="font-medium">Free from Antibiotics</p>
                  <p className="text-muted-foreground text-sm">
                    Safe and chemical-free
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-4 w-full items-start h-full  min-h-[80px]  p-4 mr-2 bg-white rounded-lg">
                <Droplet className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-secondary">
                  <p className="font-medium">No Artificial Insemination</p>
                  <p className="text-muted-foreground text-sm">
                    Ethical, traditional breeding practices
                  </p>
                </div>
              </div>
              <div className="flex flex-row w-full gap-4 items-start h-full  min-h-[80px]  p-4  mr-2 bg-white rounded-lg">
                <Droplet className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-secondary">
                  <p className="font-medium">Cruelty-Free</p>
                  <p className="text-muted-foreground text-sm">
                    Respectful, humane treatment of animals
                  </p>
                </div>
              </div>
              <div className="flex flex-row w-full gap-4 items-start h-full  min-h-[80px]  p-4  mr-2 bg-white rounded-lg">
                <Droplet className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-secondary">
                  <p className="font-medium">Hormone-Free</p>
                  <p className="text-muted-foreground text-sm">
                    No growth hormones or unnatural additives
                  </p>
                </div>
              </div>
              <div className="flex flex-row w-full gap-4 items-start h-full  min-h-[80px]  p-4  mr-2 bg-white rounded-lg">
                <Droplet className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-secondary">
                  <p className="font-medium">Chemical-Free</p>
                  <p className="text-muted-foreground text-sm">
                    Zero exposure to harmful substances
                  </p>
                </div>
              </div>
              <div className="flex flex-row w-full gap-4 items-start h-full  min-h-[80px]  p-4  mr-2 bg-white rounded-lg">
                <Droplet className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-secondary">
                  <p className="font-medium">No Steroids</p>
                  <p className="text-muted-foreground text-sm">
                    Clean, unmodified milk
                  </p>
                </div>
              </div>
              <div className="flex flex-row w-full gap-4 items-start h-full  min-h-[80px]  p-4  mr-2 bg-white rounded-lg">
                <Droplet className="w-4 h-4 mt-2 text-primary flex-shrink-0" />
                <div className="flex flex-col gap-1 text-secondary">
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
